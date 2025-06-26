const ConfigDbProcedures_GetAssignedConfigurations = `CREATE FUNCTION HTTPTEST_SCHEMA."ConfigDbProcedures_GetAssignedConfigurations" (
        CONFIG_TYPE VARCHAR(20), 
        USERNAME VARCHAR(256))  
        RETURNS TABLE(
            "ASSIGNMENT_ID" VARCHAR(40),
            "ASSIGNMENT_NAME" VARCHAR(256),
            "CONFIG_ID" VARCHAR(40),
            "CONFIG_VERSION" VARCHAR(20),
            "CONFIG_STATUS" VARCHAR(20),
            "CONFIG_NAME" VARCHAR(256),
            "DEPENDENT_CONFIG_ID" VARCHAR(40),
            "DEPENDENT_CONFIG_VERSION" VARCHAR(20),
            "DATA" VARCHAR(5000)
        )   
        LANGUAGE SQLSCRIPT
        SQL SECURITY DEFINER 
        AS
    BEGIN 
         return SELECT  
                assignment."Id" as ASSIGNMENT_ID,
                assignment."Name" as ASSIGNMENT_NAME,
                config."Id" as CONFIG_ID,
                config."Version" as CONFIG_VERSION,
                config."Status" as CONFIG_STATUS,
                config."Name" as CONFIG_NAME,
                config."ParentId" as DEPENDENT_CONFIG_ID, 
                config."ParentVersion" as DEPENDENT_CONFIG_VERSION,
                config."Data" as "DATA"
            FROM HTTPTEST_SCHEMA."ConfigDbModels_Assignment" as assignment
                JOIN HTTPTEST_SCHEMA."ConfigDbModels_Config" as config
                    ON assignment."ConfigId" = config."Id"
                    AND assignment."ConfigVersion" = config."Version"
                    and assignment."EntityType" = 'U'
                    AND assignment."EntityValue" = USERNAME
            WHERE config."Type" = CONFIG_TYPE
                AND config."Id" is not null
        ;
    END;`;

const ConfigDbProcedures_HasUserConfigurationAssigned = `CREATE FUNCTION HTTPTEST_SCHEMA."ConfigDbProcedures_HasUserConfigurationAssigned" (
        USERNAME VARCHAR(128),
        CONFIG_ID VARCHAR(40),
        CONFIG_VERSION VARCHAR(20))
        RETURNS TABLE(ALLOWED INTEGER)
        LANGUAGE SQLSCRIPT
        SQL SECURITY DEFINER 
        AS
    BEGIN 
        
        return SELECT
                CASE WHEN
                    count(*)>0
                THEN 
                    1
                ELSE
                    0
                END as ALLOWED
            FROM HTTPTEST_SCHEMA."ConfigDbModels_Assignment" as assignment
            WHERE assignment."ConfigId" = CONFIG_ID
                AND assignment."ConfigVersion" = CONFIG_VERSION
                and assignment."EntityType" = 'U'
                    AND assignment."EntityValue" = USERNAME;
    END;`;

const ConfigDbProcedures_DeleteAssignment = `CREATE PROCEDURE HTTPTEST_SCHEMA."ConfigDbProcedures_DeleteAssignment" (
        IN ASSIGNMENT_ID NVARCHAR(256)
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    AS

    BEGIN 

    DELETE FROM HTTPTEST_SCHEMA."ConfigDbModels_AssignmentHeader"
    WHERE "Id" = :ASSIGNMENT_ID;
    DELETE FROM HTTPTEST_SCHEMA."ConfigDbModels_AssignmentDetail"
    WHERE "HeaderId" = :ASSIGNMENT_ID;

END;`;

const ConfigDbProcedures_DeleteConfiguration = `CREATE PROCEDURE HTTPTEST_SCHEMA."ConfigDbProcedures_DeleteConfiguration" (
    IN CONFIG_ID NVARCHAR(40),
    IN CONFIG_VERSION NVARCHAR(20),
    IN CONFIG_STATUS NVARCHAR(20)
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    AS

    BEGIN

    DECLARE CONFIGS_TO_DELETE TABLE(CONFIG_ID NVARCHAR(40), CONFIG_VERSION NVARCHAR(20));
    DECLARE ASSIGNMENTS_TO_DELETE TABLE(ASSIGNMENT_ID NVARCHAR(40));
    DECLARE PREV_ROWCOUNT INTEGER := 0;
    DECLARE CUR_ROWCOUNT INTEGER := 1;

    CONFIGS_TO_DELETE = 
        SELECT "Id" as CONFIG_ID, "Version" as CONFIG_VERSION 
        FROM HTTPTEST_SCHEMA."ConfigDbModels_Config"
        WHERE 
            "Id" = :CONFIG_ID AND (
                "Version" = :CONFIG_VERSION
                OR :CONFIG_VERSION is null
            ) AND (
                "Status" = :CONFIG_STATUS
                OR :CONFIG_STATUS is null
            );

    WHILE CUR_ROWCOUNT > PREV_ROWCOUNT DO
        PREV_ROWCOUNT := CUR_ROWCOUNT;
        CONFIGS_TO_DELETE = 
                SELECT "Id" as CONFIG_ID, "Version" as CONFIG_VERSION
                FROM HTTPTEST_SCHEMA."ConfigDbModels_Config" configs
                    JOIN :CONFIGS_TO_DELETE as toDelete 
                        ON configs."ParentId" = toDelete.CONFIG_ID
                        AND configs."ParentVersion" = toDelete.CONFIG_VERSION
            UNION
                SELECT CONFIG_ID, CONFIG_VERSION
                FROM :CONFIGS_TO_DELETE;
        SELECT count(*) INTO CUR_ROWCOUNT FROM :CONFIGS_TO_DELETE;
    END WHILE;

    DELETE FROM HTTPTEST_SCHEMA."ConfigDbModels_Config"
    WHERE "Id" || '-' || "Version" in (
        SELECT CONFIG_ID || '-' || CONFIG_VERSION
        FROM :CONFIGS_TO_DELETE
    );

    DELETE FROM HTTPTEST_SCHEMA."ConfigDbModels_UserDefaultConfig"
    WHERE "ConfigId" || '-' || "ConfigVersion" in (
        SELECT CONFIG_ID || '-' || CONFIG_VERSION
        FROM :CONFIGS_TO_DELETE
    );

    ASSIGNMENTS_TO_DELETE = 
        SELECT DISTINCT header."Id" as ASSIGNMENT_ID
        FROM HTTPTEST_SCHEMA."ConfigDbModels_AssignmentHeader" header
        JOIN HTTPTEST_SCHEMA."ConfigDbModels_AssignmentDetail" detail
            ON header."Id" = detail."HeaderId"
        JOIN :CONFIGS_TO_DELETE as toDelete
            ON detail."ConfigId" = toDelete.CONFIG_ID
            AND detail."ConfigVersion" = toDelete.CONFIG_VERSION;

    BEGIN
        DECLARE CURSOR assignment_cursor FOR
            SELECT ASSIGNMENT_ID FROM :ASSIGNMENTS_TO_DELETE;
        FOR cur_row as assignment_cursor DO
            CALL HTTPTEST_SCHEMA."ConfigDbProcedures_DeleteAssignment"(cur_row.ASSIGNMENT_ID);
        END FOR;

    END;
            
    END;`;

const CreateAssignment = `CREATE PROCEDURE HTTPTEST_SCHEMA."legacy.config.db.procedures::CreateAssignment" (
        IN ASSIGNMENT_NAME NVARCHAR(256),
        IN ENTITY_TYPE NVARCHAR(1),
        IN ENTITY_VALUE NVARCHAR(256),
        IN CONFIGS TABLE(
            CONFIG_ID NVARCHAR(40),
            CONFIG_VERSION NVARCHAR(20),
            CONFIG_TYPE NVARCHAR(20)
        ),
        OUT GUID NVARCHAR(40)
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    AS

BEGIN

    DECLARE USERNAME NVARCHAR(256) := SESSION_CONTEXT('APPLICATIONUSER');
    DECLARE CURSOR config_cursor FOR
        SELECT CONFIG_ID, CONFIG_VERSION, CONFIG_TYPE FROM :CONFIGS;

    GUID := SYSUUID;

    INSERT INTO HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.AssignmentHeader"
        ("Id", "Name", "EntityType", "EntityValue", "Creator", "Created", "Modifier", "Modified")
        VALUES (:GUID, :ASSIGNMENT_NAME, :ENTITY_TYPE, :ENTITY_VALUE, :USERNAME, CURRENT_UTCTIMESTAMP, :USERNAME, CURRENT_UTCTIMESTAMP);

    FOR cur_row as config_cursor DO
        INSERT INTO HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.AssignmentDetail"
            ("Header.Id", "Config.Id", "Config.Version", "Config.Type")
            VALUES (:GUID, cur_row.CONFIG_ID, cur_row.CONFIG_VERSION, cur_row.CONFIG_TYPE);
    END FOR;

END;`;

const CreateConfiguration = `CREATE PROCEDURE HTTPTEST_SCHEMA."legacy.config.db.procedures::CreateConfiguration" (
        IN CONFIG_ID NVARCHAR(40),
        IN CONFIG_VERSION NVARCHAR(20),
        IN CONFIG_TYPE NVARCHAR(20),
        IN CONFIG_STATUS NVARCHAR(1),
        IN CONFIG_NAME NVARCHAR(256),
        IN PARENT_CONFIG_ID NVARCHAR(40),
        IN PARENT_CONFIG_VERSION NVARCHAR(20),
        IN DATA NCLOB,
        OUT CONFIG_ID_OUT NVARCHAR(40)
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    AS

BEGIN
    DECLARE EXISTS INTEGER;
    DECLARE USERNAME NVARCHAR(256) := SESSION_CONTEXT('APPLICATIONUSER');

    IF CONFIG_ID is NULL THEN
        CONFIG_ID_OUT := SYSUUID;
    ELSE
        CONFIG_ID_OUT := CONFIG_ID;
    END IF;

    SELECT count(*) INTO EXISTS 
    FROM HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.Config"
    WHERE "Id" = :CONFIG_ID AND "Version" = CONFIG_VERSION;

    IF EXISTS > 0 THEN
        UPDATE HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.Config"
        SET
            "Status" = COALESCE(:CONFIG_STATUS, "Status"),
            "Name" = COALESCE(:CONFIG_NAME, "Name"),
            "Parent.Id" = COALESCE(:PARENT_CONFIG_ID, "Parent.Id"),
            "Parent.Version" = COALESCE(:PARENT_CONFIG_VERSION, "Parent.Version"),
            "Data" = COALESCE(:DATA, "Data"),
            "Modifier" = :USERNAME,
            "Modified" = CURRENT_UTCTIMESTAMP
        WHERE "Id" = :CONFIG_ID AND "Version" = CONFIG_VERSION;
    ELSE
        INSERT INTO HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.Config"
            ("Id", "Version", "Type", "Status", "Name", "Parent.Id", "Parent.Version", "Data", "Creator", "Created", "Modifier", "Modified")
            VALUES (:CONFIG_ID_OUT, :CONFIG_VERSION, :CONFIG_TYPE, :CONFIG_STATUS, :CONFIG_NAME, :PARENT_CONFIG_ID, :PARENT_CONFIG_VERSION, :DATA, :USERNAME, CURRENT_UTCTIMESTAMP, :USERNAME, CURRENT_UTCTIMESTAMP);
    END IF;



END;`;

const DeleteAssignment = `CREATE PROCEDURE HTTPTEST_SCHEMA."legacy.config.db.procedures::DeleteAssignment" (
        IN ASSIGNMENT_ID NVARCHAR(256)
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    AS

BEGIN 
 
    DELETE FROM HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.AssignmentHeader"
    WHERE "Id" = :ASSIGNMENT_ID;
    DELETE FROM HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.AssignmentDetail"
    WHERE "Header.Id" = :ASSIGNMENT_ID;

END;`;

const DeleteConfiguration = `CREATE PROCEDURE HTTPTEST_SCHEMA."legacy.config.db.procedures::DeleteConfiguration" (
        IN CONFIG_ID NVARCHAR(40),
        IN CONFIG_VERSION NVARCHAR(20),
        IN CONFIG_STATUS NVARCHAR(20)
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    AS

BEGIN

    DECLARE CONFIGS_TO_DELETE TABLE(CONFIG_ID NVARCHAR(40), CONFIG_VERSION NVARCHAR(20));
    DECLARE ASSIGNMENTS_TO_DELETE TABLE(ASSIGNMENT_ID NVARCHAR(40));
    DECLARE PREV_ROWCOUNT INTEGER := 0;
    DECLARE CUR_ROWCOUNT INTEGER := 1;

    CONFIGS_TO_DELETE = 
        SELECT "Id" as CONFIG_ID, "Version" as CONFIG_VERSION 
        FROM HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.Config"
        WHERE 
            "Id" = :CONFIG_ID AND (
                "Version" = :CONFIG_VERSION
                OR :CONFIG_VERSION is null
            ) AND (
                "Status" = :CONFIG_STATUS
                OR :CONFIG_STATUS is null
            );

    WHILE CUR_ROWCOUNT > PREV_ROWCOUNT DO
        PREV_ROWCOUNT := CUR_ROWCOUNT;
        CONFIGS_TO_DELETE = 
                SELECT "Id" as CONFIG_ID, "Version" as CONFIG_VERSION
                FROM HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.Config" configs
                    JOIN :CONFIGS_TO_DELETE as toDelete 
                        ON configs."Parent.Id" = toDelete.CONFIG_ID
                        AND configs."Parent.Version" = toDelete.CONFIG_VERSION
            UNION
                SELECT CONFIG_ID, CONFIG_VERSION
                FROM :CONFIGS_TO_DELETE;
        SELECT count(*) INTO CUR_ROWCOUNT FROM :CONFIGS_TO_DELETE;
    END WHILE;

    DELETE FROM HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.Config"
    WHERE "Id" || '-' || "Version" in (
        SELECT CONFIG_ID || '-' || CONFIG_VERSION
        FROM :CONFIGS_TO_DELETE
    );

    DELETE FROM HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.UserDefaultConfig"
    WHERE "Config.Id" || '-' || "Config.Version" in (
        SELECT CONFIG_ID || '-' || CONFIG_VERSION
        FROM :CONFIGS_TO_DELETE
    );


    
    ASSIGNMENTS_TO_DELETE = 
        SELECT DISTINCT header."Id" as ASSIGNMENT_ID
        FROM HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.AssignmentHeader" header
        JOIN HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.AssignmentDetail" detail
            ON header."Id" = detail."Header.Id"
        JOIN :CONFIGS_TO_DELETE as toDelete
            ON detail."Config.Id" = toDelete.CONFIG_ID
            AND detail."Config.Version" = toDelete.CONFIG_VERSION;

    BEGIN
        DECLARE CURSOR assignment_cursor FOR
            SELECT ASSIGNMENT_ID FROM :ASSIGNMENTS_TO_DELETE;
        FOR cur_row as assignment_cursor DO
            CALL HTTPTEST_SCHEMA."legacy.config.db.procedures::DeleteAssignment"(cur_row.ASSIGNMENT_ID);
        END FOR;

    END;
            
END;`;

const GetOrganizations = `CREATE PROCEDURE HTTPTEST_SCHEMA."legacy.config.db.procedures::GetOrganizations" (IN USERNAME NVARCHAR(256), OUT ORGS table ("ORG_ID" NVARCHAR(1024))) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    READS SQL DATA AS

BEGIN
 
    ORGS = 
        SELECT DISTINCT CAST("OrgID" AS NVARCHAR(100)) AS "ORG_ID" 
        FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::Config.V_ORG"
        WHERE "OrgID" IN
            (SELECT  "OrgID" AS ORG_ID 
            FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::Config.UserOrgMapping"
            WHERE UPPER("UserName") = UPPER(:USERNAME)
            
            UNION
            
            SELECT "OrgID" AS ORG_ID 
            FROM HTTPTEST_SCHEMA."legacy.cdw.db.models::Config.UserOrgMapping"
            WHERE UPPER("UserName") = UPPER(:USERNAME)
            )
    ;
            
END;`;

const GetAssignedConfigurations = `CREATE PROCEDURE HTTPTEST_SCHEMA."legacy.config.db.procedures::GetAssignedConfigurations" (
    IN CONFIG_TYPE VARCHAR(20), 
    IN USERNAME NVARCHAR(256),  
    OUT configs TABLE(
        ASSIGNMENT_ID VARCHAR(40),
        ASSIGNMENT_NAME NVARCHAR(256),
        CONFIG_ID VARCHAR(40),
        CONFIG_VERSION VARCHAR(20),
        CONFIG_STATUS VARCHAR(20),
        CONFIG_NAME NVARCHAR(256),
        DEPENDENT_CONFIG_ID VARCHAR(40),
        DEPENDENT_CONFIG_VERSION VARCHAR(20),
        DATA NCLOB
    )
)  
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    READS SQL DATA AS
    
BEGIN 

    CALL HTTPTEST_SCHEMA."legacy.config.db.procedures::GetOrganizations"(:USERNAME, orgs);
    
    entities = SELECT 'U' as ENTITY_TYPE, :USERNAME as ENTITY_VALUE FROM DUMMY 
                    UNION
                SELECT 'O', ORG_ID as ENTITY_VALUE FROM :orgs
    ;

    CONFIGS = 
        SELECT  
            assignment."Id" as ASSIGNMENT_ID,
            assignment."Name" as ASSIGNMENT_NAME,
            config."Id" as CONFIG_ID,
            config."Version" as CONFIG_VERSION,
            config."Status" as CONFIG_STATUS,
            config."Name" as CONFIG_NAME,
            config."Parent.Id" as DEPENDENT_CONFIG_ID, 
            config."Parent.Version" as DEPENDENT_CONFIG_VERSION,
            config."Data" as "DATA"
        FROM :entities as ent
            JOIN HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.Assignment" as assignment
                ON assignment."EntityType" = ent.ENTITY_TYPE
                AND assignment."EntityValue" = ent.ENTITY_VALUE
            JOIN  HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.Config" as config
                ON assignment."ConfigId" = config."Id"
                AND assignment."ConfigVersion" = config."Version"
        WHERE config."Type" = :CONFIG_TYPE
            AND config."Id" is not null
    ;

END;`;

const GetConfiguration = `CREATE PROCEDURE HTTPTEST_SCHEMA."legacy.config.db.procedures::GetConfiguration" (
        IN CONFIG_ID NVARCHAR(40),
        IN CONFIG_VERSION NVARCHAR(20),
        IN CONFIG_STATUS NVARCHAR(1),
        OUT CONFIGS TABLE(
            CONFIG_ID NVARCHAR(40),
            CONFIG_VERSION NVARCHAR(20),
            CONFIG_TYPE NVARCHAR(20),
            CONFIG_STATUS NVARCHAR(1),
            CONFIG_NAME NVARCHAR(256),
            PARENT_CONFIG_ID NVARCHAR(40),
            PARENT_CONFIG_VERSION NVARCHAR(20),
            CREATOR NVARCHAR(256),
            CREATED TIMESTAMP,
            MODIFIER NVARCHAR(256),
            MODIFIED TIMESTAMP,
            DATA NCLOB
        )
    ) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    READS SQL DATA AS

BEGIN
    CONFIGS = 
        SELECT 
            "Id" AS CONFIG_ID, 
            "Version" AS CONFIG_VERSION, 
            "Type" AS CONFIG_TYPE, 
            "Status" AS CONFIG_STATUS, 
            "Name" AS CONFIG_NAME, 
            "Parent.Id" AS PARENT_CONFIG_ID, 
            "Parent.Version" AS PARENT_CONFIG_VERSION, 
            "Creator" AS CREATOR, 
            "Created" AS CREATED, 
            "Modifier" AS MODIFIER, 
            "Modified" AS MODIFIED, 
            "Data" AS DATA
        FROM HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.Config"
        WHERE 
            "Id" = :CONFIG_ID
            AND ("Version" = :CONFIG_VERSION or :CONFIG_VERSION is null)
            AND ("Status" = :CONFIG_STATUS or :CONFIG_STATUS is null)
        ;
END;`;

const HasUserConfigurationAssigned = `CREATE PROCEDURE HTTPTEST_SCHEMA."legacy.config.db.procedures::HasUserConfigurationAssigned" (
    IN USERNAME NVARCHAR(128),
    IN CONFIG_ID VARCHAR(40),
    IN CONFIG_VERSION VARCHAR(20),
    OUT ALLOWED TABLE(ALLOWED INTEGER) 
) 
    LANGUAGE SQLSCRIPT
    SQL SECURITY DEFINER 
    READS SQL DATA AS


BEGIN 


    CALL HTTPTEST_SCHEMA."legacy.config.db.procedures::GetOrganizations"(:USERNAME, orgs);
    
    entities = SELECT 'U' as ENTITY_TYPE, :USERNAME as ENTITY_VALUE FROM DUMMY
                    UNION
                SELECT 'U' as ENTITY_TYPE, 'DEFAULT_CONFIG_ASSIGNMENT' as ENTITY_VALUE FROM DUMMY
                    UNION
                SELECT 'O', ORG_ID as ENTITY_VALUE FROM :orgs;

    
    ALLOWED = SELECT    
            CASE WHEN
                count(*)>0
            THEN 
                1
            ELSE
                0
            END as ALLOWED
        FROM :entities as ent
            JOIN HTTPTEST_SCHEMA."legacy.config.db.models::Configuration.Assignment" as assignment
                ON assignment."EntityType" = ent.ENTITY_TYPE
                AND assignment."EntityValue" = ent.ENTITY_VALUE
        WHERE assignment."ConfigId" = :CONFIG_ID
            AND assignment."ConfigVersion" = :CONFIG_VERSION;

END;`;

const MatchCandidates = `CREATE procedure HTTPTEST_SCHEMA."legacy.ots.am.lib::MatchCandidates"(
		in  iv_profile_name nvarchar(100),
		in  it_candidates   HTTPTEST_SCHEMA."legacy.ots.am::Types.Candidate",
		out ot_matches      HTTPTEST_SCHEMA."legacy.ots.am::Types.Match"
	)
	language sqlscript
	sql security definer
	as
begin
    ot_matches = 
    select
        "CandidateID",
        "ComponentID",
        "ComponentTermText",
        "VocabularyID",
        "Code",
        null as "TermText",
        0.0 as "Confidence"
    from :it_candidates;
end
;`;

const functionsAndProcedures = [
  ConfigDbProcedures_GetAssignedConfigurations,
  ConfigDbProcedures_HasUserConfigurationAssigned,
  ConfigDbProcedures_DeleteAssignment,
  ConfigDbProcedures_DeleteConfiguration,
  CreateAssignment,
  CreateConfiguration,
  DeleteAssignment,
  DeleteConfiguration,
  GetOrganizations,
  GetAssignedConfigurations,
  GetConfiguration,
  HasUserConfigurationAssigned,
  MatchCandidates,
];

module.exports = { functionsAndProcedures };
