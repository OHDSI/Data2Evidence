const ConfigDbProcedures_GetAssignedConfigurations = `create or replace
function "HTTPTEST_SCHEMA"."ConfigDbProcedures_GetAssignedConfigurations" (
        CONFIG_TYPE VARCHAR(20), 
        USERNAME VARCHAR(256))  
        returns table(
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
        language plpgsql
        as $$
    begin 
         return query
select
	assignment."Id" as ASSIGNMENT_ID,
	assignment."Name" as ASSIGNMENT_NAME,
	config."Id" as CONFIG_ID,
	config."Version" as CONFIG_VERSION,
	config."Status" as CONFIG_STATUS,
	config."Name" as CONFIG_NAME,
	config."ParentId" as DEPENDENT_CONFIG_ID,
	config."ParentVersion" as DEPENDENT_CONFIG_VERSION,
	config."Data" as "DATA"
from
	"HTTPTEST_SCHEMA"."ConfigDbModels_Assignment" as assignment
join "HTTPTEST_SCHEMA"."ConfigDbModels_Config" as config
                    on
	assignment."ConfigId" = config."Id"
	and assignment."ConfigVersion" = config."Version"
	and assignment."EntityType" = 'U'
	and assignment."EntityValue" = USERNAME
where
	config."Type" = CONFIG_TYPE
	and config."Id" is not null
        ;
end;
$$;`;

const ConfigDbProcedures_HasUserConfigurationAssigned = `create or replace
function "HTTPTEST_SCHEMA"."ConfigDbProcedures_HasUserConfigurationAssigned" (
        USERNAME VARCHAR(128),
        CONFIG_ID VARCHAR(40),
        CONFIG_VERSION VARCHAR(20))
        returns table(ALLOWED INTEGER)
        language plpgsql
        as $$
    begin 
        
        return query 
        select
	case
		when
                    count(*)>0
                then 
                    1
		else
                    0
	end as ALLOWED
from
	"HTTPTEST_SCHEMA"."ConfigDbModels_Assignment" as assignment
where
	assignment."ConfigId" = CONFIG_ID
	and assignment."ConfigVersion" = CONFIG_VERSION
	and assignment."EntityType" = 'U'
	and assignment."EntityValue" = USERNAME;
end;

$$;`;

const ConfigDbProcedures_DeleteAssignment = `create or replace
procedure "HTTPTEST_SCHEMA"."ConfigDbProcedures_DeleteAssignment" (
        in ASSIGNMENT_ID character varying(256)
    ) 
    language plpgsql
    as $$

    begin 

    delete
from
	"HTTPTEST_SCHEMA"."ConfigDbModels_AssignmentHeader"
where
	"Id" = ASSIGNMENT_ID;

delete
from
	"HTTPTEST_SCHEMA"."ConfigDbModels_AssignmentDetail"
where
	"HeaderId" = ASSIGNMENT_ID;
end;
$$;`;

const ConfigDbProcedures_DeleteConfiguration = `create OR replace procedure "HTTPTEST_SCHEMA"."ConfigDbProcedures_DeleteConfiguration" (
	IN CONF_ID varchar(40),
	IN CONF_VERSION varchar(20),
	IN CONF_STATUS varchar(20)
) 
	language plpgsql 
	AS $$ 
	declare 
		PREV_ROWCOUNT INTEGER default 0;
		CUR_ROWCOUNT INTEGER default 1;
		r record;

	begin 
		create temp table CONFIGS_TO_DELETE (
			CONFIG_ID varchar(40),
			CONFIG_VERSION varchar(20)
		);

		create temporary table ASSIGNMENTS_TO_DELETE (ASSIGNMENT_ID varchar(40));

		insert into
			CONFIGS_TO_DELETE (CONFIG_ID, CONFIG_VERSION)
		SELECT
			"Id" AS CONFIG_ID,
			"Version" AS CONFIG_VERSION
		FROM
			"HTTPTEST_SCHEMA"."ConfigDbModels_Config"
		WHERE
			"Id" = CONF_ID
			AND (
				"Version" = CONF_VERSION
				OR CONF_VERSION is NULL
			)
			AND (
				"Status" = CONF_STATUS
				OR CONF_STATUS is NULL
			);

		while CUR_ROWCOUNT > PREV_ROWCOUNT loop 
			PREV_ROWCOUNT := CUR_ROWCOUNT;
			insert into
				CONFIGS_TO_DELETE (CONFIG_ID, CONFIG_VERSION)
				SELECT
					"Id" AS CONFIG_ID,
					"Version" AS CONFIG_VERSION
				FROM
					"HTTPTEST_SCHEMA"."ConfigDbModels_Config" configs
					JOIN CONFIGS_TO_DELETE AS toDelete ON configs."ParentId" = toDelete.CONFIG_ID
					AND configs."ParentVersion" = toDelete.CONFIG_VERSION
				UNION
				SELECT
					CONFIG_ID,
					CONFIG_VERSION
				FROM
					CONFIGS_TO_DELETE;

				SELECT
					count(*) into CUR_ROWCOUNT
				FROM
					CONFIGS_TO_DELETE;
		END loop;

		delete FROM
			"HTTPTEST_SCHEMA"."ConfigDbModels_Config"
		WHERE
			"Id" || '-' || "Version" IN (
				SELECT
					CONFIG_ID || '-' || CONFIG_VERSION
				FROM
					CONFIGS_TO_DELETE
			);

		delete FROM
			"HTTPTEST_SCHEMA"."ConfigDbModels_UserDefaultConfig"
		WHERE
			"ConfigId" || '-' || "ConfigVersion" IN (
				SELECT
					CONFIG_ID || '-' || CONFIG_VERSION
				FROM
					CONFIGS_TO_DELETE
			);

		insert into ASSIGNMENTS_TO_DELETE (ASSIGNMENT_ID)
			SELECT
				DISTINCT header."Id" AS ASSIGNMENT_ID
			FROM
				"HTTPTEST_SCHEMA"."ConfigDbModels_AssignmentHeader" header
				JOIN "HTTPTEST_SCHEMA"."ConfigDbModels_AssignmentDetail" detail ON header."Id" = detail."HeaderId"
				JOIN CONFIGS_TO_DELETE AS toDelete ON detail."ConfigId" = toDelete.CONFIG_ID
				AND detail."ConfigVersion" = toDelete.CONFIG_VERSION;

		begin 
			for r in select * from ASSIGNMENTS_TO_DELETE loop
				call "HTTPTEST_SCHEMA"."ConfigDbProcedures_DeleteAssignment"(r.ASSIGNMENT_ID);
			end loop;
		end;
	end;
$$;`;

const Drop_CreateAssignmentConfigType = `DROP TYPE IF EXISTS CREATE_ASSIGNMENT_CONFIG_TYPE CASCADE;`;

const Create_CreateAssignmentConfigType = `CREATE TYPE CREATE_ASSIGNMENT_CONFIG_TYPE AS (CONFIG_ID VARCHAR(40),
            CONFIG_VERSION VARCHAR(20),
            CONFIG_TYPE VARCHAR(20));`;

const CreateAssignment = `CREATE or replace PROCEDURE "HTTPTEST_SCHEMA"."legacy.config.db.procedures::CreateAssignment" (
        IN ASSIGNMENT_NAME character varying(256),
        IN ENTITY_TYPE character varying(1),
        IN ENTITY_VALUE character varying(256),
        IN CONFIGS CREATE_ASSIGNMENT_CONFIG_TYPE[],
        OUT GUID character varying(40)
    ) 
    LANGUAGE plpgsql
    as $$

    DECLARE 
		USERNAME VARCHAR(256) := 'TEST_USER';
		r record;
	BEGIN
		GUID := uuid_generate_v4()::character varying;

	    INSERT INTO "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentHeader"
	        ("Id", "Name", "EntityType", "EntityValue", "Creator", "Created", "Modifier", "Modified")
	        VALUES (GUID, ASSIGNMENT_NAME, ENTITY_TYPE, ENTITY_VALUE, USERNAME, timezone('utc', now()), USERNAME, timezone('utc', now()));

		begin 
			for r in SELECT * FROM CONFIGS loop
				INSERT INTO "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentDetail" 
					("Header.Id", "Config.Id", "Config.Version", "Config.Type")
	            	VALUES (GUID, r.CONFIG_ID, r.CONFIG_VERSION, r.CONFIG_TYPE);
			end loop;
		end;
	END;
$$;`;

const CreateConfiguration = `CREATE or replace PROCEDURE "HTTPTEST_SCHEMA"."legacy.config.db.procedures::CreateConfiguration" (
        IN CONFIG_ID character varying(40),
        IN CONFIG_VERSION character varying(20),
        IN CONFIG_TYPE character varying(20),
        IN CONFIG_STATUS character varying(1),
        IN CONFIG_NAME character varying(256),
        IN PARENT_CONFIG_ID character varying(40),
        IN PARENT_CONFIG_VERSION character varying(20),
        IN DATA TEXT,
        OUT CONFIG_ID_OUT character varying(40)
    ) 
    LANGUAGE plpgsql
    as $$

DECLARE
    EXISTS INTEGER;
    USERNAME character varying(256) := 'TEST_USERS'; 
BEGIN
    IF CONFIG_ID is NULL THEN
        CONFIG_ID_OUT = uuid_generate_v4()::character varying;
    ELSE
        CONFIG_ID_OUT = CONFIG_ID;
    END IF;

    SELECT count(*) INTO EXISTS 
    FROM "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config"
    WHERE "Id" = CONFIG_ID AND "Version" = CONFIG_VERSION;

    IF EXISTS > 0 THEN
        UPDATE "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config"
        SET
            "Status" = COALESCE(CONFIG_STATUS, "Status"),
            "Name" = COALESCE(CONFIG_NAME, "Name"),
            "Parent.Id" = COALESCE(PARENT_CONFIG_ID, "Parent.Id"),
            "Parent.Version" = COALESCE(PARENT_CONFIG_VERSION, "Parent.Version"),
            "Data" = COALESCE(DATA, "Data"),
            "Modifier" = USERNAME,
            "Modified" = timezone('utc', now())
        WHERE "Id" = CONFIG_ID AND "Version" = CONFIG_VERSION;
    ELSE
        INSERT INTO "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config"
            ("Id", "Version", "Type", "Status", "Name", "Parent.Id", "Parent.Version", "Data", "Creator", "Created", "Modifier", "Modified")
            VALUES (CONFIG_ID_OUT, CONFIG_VERSION, CONFIG_TYPE, CONFIG_STATUS, CONFIG_NAME, PARENT_CONFIG_ID, PARENT_CONFIG_VERSION, DATA, USERNAME, timezone('utc', now()), USERNAME, timezone('utc', now()));
    END IF;
END;
$$;`;

const DeleteAssignment = `CREATE or replace PROCEDURE "HTTPTEST_SCHEMA"."legacy.config.db.procedures::DeleteAssignment" (
        IN ASSIGNMENT_ID character varying(256)
    ) 
    LANGUAGE plpgsql 
    as $$

	BEGIN 
	    DELETE FROM "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentHeader"
	    WHERE "Id" = ASSIGNMENT_ID;
	    DELETE FROM "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentDetail"
	    WHERE "Header.Id" = ASSIGNMENT_ID;
	END;
$$;`;

const DeleteConfiguration = `CREATE or replace PROCEDURE "HTTPTEST_SCHEMA"."legacy.config.db.procedures::DeleteConfiguration" (
        IN CONFIG_ID character varying(40),
        IN CONFIG_VERSION character varying(20),
        IN CONFIG_STATUS character varying(20)
    ) 
    LANGUAGE plpgsql
    as $$
	DECLARE
	    PREV_ROWCOUNT INTEGER := 0;
	    CUR_ROWCOUNT INTEGER := 1;
		r record;

	BEGIN
		create temp table CONFIGS_TO_DELETE (CONFIG_ID character varying(40), CONFIG_VERSION character varying(20));
	    create temp table ASSIGNMENTS_TO_DELETE (ASSIGNMENT_ID character varying(40));
    	insert into CONFIGS_TO_DELETE
	        SELECT "Id" as CONFIG_ID, "Version" as CONFIG_VERSION 
	        FROM "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config"
	        WHERE 
	            "Id" = CONFIG_ID AND (
	                "Version" = CONFIG_VERSION
	                OR CONFIG_VERSION is null
	            ) AND (
	                "Status" = CONFIG_STATUS
	                OR CONFIG_STATUS is null
	            );

	    WHILE CUR_ROWCOUNT > PREV_ROWCOUNT loop
	        PREV_ROWCOUNT := CUR_ROWCOUNT;
	        insert into CONFIGS_TO_DELETE 
	                SELECT "Id" as CONFIG_ID, "Version" as CONFIG_VERSION
	                FROM "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config" configs
	                    JOIN CONFIGS_TO_DELETE as toDelete 
	                        ON configs."Parent.Id" = toDelete.CONFIG_ID
	                        AND configs."Parent.Version" = toDelete.CONFIG_VERSION
	            UNION
	                SELECT CONFIG_ID, CONFIG_VERSION
	                FROM CONFIGS_TO_DELETE;
	        SELECT count(*) INTO CUR_ROWCOUNT FROM CONFIGS_TO_DELETE;
	    END loop;
	
	    DELETE FROM "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config"
	    WHERE "Id" || '-' || "Version" in (
	        SELECT CONFIG_ID || '-' || CONFIG_VERSION
	        FROM CONFIGS_TO_DELETE
	    );
	
	    DELETE FROM "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.UserDefaultConfig"
	    WHERE "Config.Id" || '-' || "Config.Version" in (
	        SELECT CONFIG_ID || '-' || CONFIG_VERSION
	        FROM CONFIGS_TO_DELETE
	    );
	
	    insert into ASSIGNMENTS_TO_DELETE 
	        SELECT DISTINCT header."Id" as ASSIGNMENT_ID
	        FROM "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentHeader" header
	        JOIN "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.AssignmentDetail" detail
	            ON header."Id" = detail."Header.Id"
	        JOIN CONFIGS_TO_DELETE as toDelete
	            ON detail."Config.Id" = toDelete.CONFIG_ID
	            AND detail."Config.Version" = toDelete.CONFIG_VERSION;
	
		begin 
			for r in select * from ASSIGNMENTS_TO_DELETE loop
				call "HTTPTEST_SCHEMA"."ConfigDbProcedures_DeleteAssignment"(r.ASSIGNMENT_ID);
			end loop;
		end;         
	END;
$$;`;

const Drop_OrgType = `DROP TYPE IF EXISTS ORG_TYPE CASCADE;`;

const Create_OrgType = `CREATE TYPE ORG_TYPE AS ("ORG_ID" character varying(1024));`;

const GetOrganizations = `CREATE or replace PROCEDURE "HTTPTEST_SCHEMA"."legacy.config.db.procedures::GetOrganizations" (IN USERNAME character varying(256), OUT ORGS ORG_TYPE[]) 
    LANGUAGE plpgsql
    as $$

BEGIN
 
    insert into ORGS 
        SELECT DISTINCT CAST("OrgID" AS character varying(100)) AS "ORG_ID" 
        FROM "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.V_ORG"
        WHERE "OrgID" IN
            (SELECT  "OrgID" AS ORG_ID 
            FROM "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.UserOrgMapping"
            WHERE UPPER("UserName") = UPPER(USERNAME)
            
            UNION
            
            SELECT "OrgID" AS ORG_ID 
            FROM "HTTPTEST_SCHEMA"."legacy.cdw.db.models::Config.UserOrgMapping"
            WHERE UPPER("UserName") = UPPER(USERNAME)
            )
    ;       
END;
$$;`;

const Drop_GetAssignedConfigurationsConfigType = `DROP TYPE IF EXISTS GET_ASSIGNED_CONFIGURATIONS_CONFIG_TYPE CASCADE;`;

const Create_GetAssignedConfigurationsConfigType = `CREATE TYPE GET_ASSIGNED_CONFIGURATIONS_CONFIG_TYPE AS (
        ASSIGNMENT_ID VARCHAR(40),
        ASSIGNMENT_NAME character varying(256),
        CONFIG_ID VARCHAR(40),
        CONFIG_VERSION VARCHAR(20),
        CONFIG_STATUS VARCHAR(20),
        CONFIG_NAME character varying(256),
        DEPENDENT_CONFIG_ID VARCHAR(40),
        DEPENDENT_CONFIG_VERSION VARCHAR(20),
        DATA TEXT
    );`;

const GetAssignedConfigurations = `CREATE or replace PROCEDURE "HTTPTEST_SCHEMA"."legacy.config.db.procedures::GetAssignedConfigurations" (
    IN CONFIG_TYPE VARCHAR(20), 
    IN USERNAME character varying(256),  
    OUT CONFIGS GET_ASSIGNED_CONFIGURATIONS_CONFIG_TYPE[]
)  
    LANGUAGE plpgsql
    as $$
    
BEGIN 

    CALL "HTTPTEST_SCHEMA"."legacy.config.db.procedures::GetOrganizations"(USERNAME, orgs);
    
    insert into entities
		SELECT 'U' as ENTITY_TYPE, USERNAME as ENTITY_VALUE FROM DUMMY 
        	UNION
        SELECT 'O', ORG_ID as ENTITY_VALUE FROM orgs
    ;

    insert into CONFIGS 
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
        FROM entities as ent
            JOIN "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Assignment" as assignment
                ON assignment."EntityType" = ent.ENTITY_TYPE
                AND assignment."EntityValue" = ent.ENTITY_VALUE
            JOIN  "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config" as config
                ON assignment."ConfigId" = config."Id"
                AND assignment."ConfigVersion" = config."Version"
        WHERE config."Type" = CONFIG_TYPE
            AND config."Id" is not null
    ;

END;
$$;`;

const Drop_GetConfigurationConfigType = `DROP TYPE IF EXISTS GET_CONFIGURATION_CONFIG_TYPE CASCADE;`;

const Create_GetConfigurationConfigType = `CREATE TYPE GET_CONFIGURATION_CONFIG_TYPE AS (
            CONFIG_ID character varying(40),
            CONFIG_VERSION character varying(20),
            CONFIG_TYPE character varying(20),
            CONFIG_STATUS character varying(1),
            CONFIG_NAME character varying(256),
            PARENT_CONFIG_ID character varying(40),
            PARENT_CONFIG_VERSION character varying(20),
            CREATOR character varying(256),
            CREATED TIMESTAMP,
            MODIFIER character varying(256),
            MODIFIED TIMESTAMP,
            DATA TEXT
        );`;

const GetConfiguration = `CREATE or replace PROCEDURE "HTTPTEST_SCHEMA"."legacy.config.db.procedures::GetConfiguration" (
        IN CONFIG_ID character varying(40),
        IN CONFIG_VERSION character varying(20),
        IN CONFIG_STATUS character varying(1),
        OUT CONFIGS GET_CONFIGURATION_CONFIG_TYPE[]
    ) 
    LANGUAGE plpgsql
    as $$

BEGIN
    insert into CONFIGS
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
        FROM "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Config"
        WHERE 
            "Id" = CONFIG_ID
            AND ("Version" = CONFIG_VERSION or CONFIG_VERSION is null)
            AND ("Status" = CONFIG_STATUS or CONFIG_STATUS is null)
        ;
END;
$$;`;

const Drop_AllowedType = `DROP TYPE IF EXISTS ALLOWED_TYPE CASCADE;`;
const Create_AllowedType = `CREATE TYPE ALLOWED_TYPE AS (
            ALLOWED INTEGER
        );`;

const HasUserConfigurationAssigned = `CREATE or replace PROCEDURE "HTTPTEST_SCHEMA"."legacy.config.db.procedures::HasUserConfigurationAssigned" (
    IN USERNAME character varying(128),
    IN CONFIG_ID VARCHAR(40),
    IN CONFIG_VERSION VARCHAR(20),
    OUT ALLOWED ALLOWED_TYPE[]
) 
    LANGUAGE plpgsql
    as $$


BEGIN 


    CALL "HTTPTEST_SCHEMA"."legacy.config.db.procedures::GetOrganizations"(USERNAME, orgs);
    
    insert into entities 
		SELECT 'U' as ENTITY_TYPE, USERNAME as ENTITY_VALUE FROM DUMMY
            UNION
        SELECT 'U' as ENTITY_TYPE, 'DEFAULT_CONFIG_ASSIGNMENT' as ENTITY_VALUE FROM DUMMY
            UNION
        SELECT 'O', ORG_ID as ENTITY_VALUE FROM orgs;

    
    insert into ALLOWED
		SELECT    
            CASE WHEN
                count(*)>0
            THEN 
                1
            ELSE
                0
            END as ALLOWED
        FROM entities as ent
            JOIN "HTTPTEST_SCHEMA"."legacy.config.db.models::Configuration.Assignment" as assignment
                ON assignment."EntityType" = ent.ENTITY_TYPE
                AND assignment."EntityValue" = ent.ENTITY_VALUE
        WHERE assignment."ConfigId" = CONFIG_ID
            AND assignment."ConfigVersion" = CONFIG_VERSION;

END;
$$;`;

const Drop_CandidateType = `drop type if exists "HTTPTEST_SCHEMA"."legacy.ots.am::Types.Candidate" cascade;`;
const Create_CandidateType = `create type "HTTPTEST_SCHEMA"."legacy.ots.am::Types.Candidate" as ( "CandidateID" BIGINT,
"ComponentID" INTEGER,
"ComponentTermText" character varying(5000) ,
"VocabularyID" character varying(100) ,
"Code" character varying(100) );`;
const Drop_MatchType = `drop type if exists "HTTPTEST_SCHEMA"."legacy.ots.am::Types.Match" cascade;`;
const Create_MatchType = `create type "HTTPTEST_SCHEMA"."legacy.ots.am::Types.Match" as ( "CandidateID" BIGINT,
"ComponentID" INTEGER,
"ComponentTermText" character varying(5000),
"VocabularyID" character varying(100) ,
"Code" character varying(100) ,
"TermText" character varying(5000) ,
"Confidence" DOUBLE precision );`;

const MatchCandidates = `create or replace
procedure "HTTPTEST_SCHEMA"."legacy.ots.am.lib::MatchCandidates"(
		in iv_profile_name character varying(100),
		in it_candidates "HTTPTEST_SCHEMA"."legacy.ots.am::Types.Candidate",
		out ot_matches "HTTPTEST_SCHEMA"."legacy.ots.am::Types.Match"
	)
	language plpgsql
	as $$
begin
    insert into ot_matches
	    select
			"CandidateID",
			"ComponentID",
			"ComponentTermText",
			"VocabularyID",
			"Code",
			null as "TermText",
			0.0 as "Confidence"
		from
			it_candidates;
end;
$$;`;

const functionsAndProcedures = [
  Drop_AllowedType,
  Drop_CandidateType,
  Drop_CreateAssignmentConfigType,
  Drop_GetAssignedConfigurationsConfigType,
  Drop_GetConfigurationConfigType,
  Drop_MatchType,
  Drop_OrgType,
  Create_AllowedType,
  Create_CandidateType,
  Create_CreateAssignmentConfigType,
  Create_GetAssignedConfigurationsConfigType,
  Create_GetConfigurationConfigType,
  Create_MatchType,
  Create_OrgType,
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
