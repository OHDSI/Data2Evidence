interface ParameterInterface {
  value: string | number;
  type?: string;
}

// Translation function containing regex that are shared between DUCKDB and POSTGRES dialects
const hanaCommonTranslation = (temp: string, schemaName: string, vocabSchemaName: string): string => {
  // The first few queries to replace are very specific query which does not require further string replacements
  // subsequent lines, hence early return is used.
  const regex1 =
    /UPSERT \"ConfigDbModels_UserDefaultConfig\" \(\"User\", \"ConfigType\", \"ConfigId\", \"ConfigVersion\"\) VALUES \((%s|\?),(%s|\?),(%s|\?),(%s|\?)\) WITH PRIMARY KEY/gi;
  if (temp.match(regex1)) {
    // replace is used with a function as "$1" gets interpreted as a capture group, and will become "?" instead of the desired "$1"
    // For example, "UPSERT "ConfigDbModels_UserDefaultConfig" ("User", "ConfigType", "ConfigId", "ConfigVersion") VALUES (?,?,?,?) WITH PRIMARY KEY"
    // will replace $1, $2, $3, $4 with "?" since these 4 values are captured in the match.
    return temp.replace(
      regex1,
      () => `INSERT INTO "ConfigDbModels_UserDefaultConfig" ("User", "ConfigType", "ConfigId", "ConfigVersion")
          VALUES ($1,$2,$3,$4) on
          conflict ("User", "ConfigType") do
          update
          set "User" = $1, "ConfigType" = $2, "ConfigId" = $3, "ConfigVersion" = $4`,
    );
  }

  // const regex2 = /SELECT DISTINCT\(TABLE_NAME\) FROM TABLES WHERE SCHEMA_NAME=\? AND IS_USER_DEFINED_TYPE='FALSE'/
  const regex2 =
    /SELECT DISTINCT\(TABLE_NAME\) FROM TABLES WHERE SCHEMA_NAME='(.*?)' AND IS_USER_DEFINED_TYPE='FALSE'/;
  if (temp.match(regex2)) {
    const schemaName = regex2.exec(temp)[1];
    return `
      SELECT DISTINCT(table_name) as "(TABLE_NAME)"
      FROM information_schema.tables
      WHERE table_schema = '${schemaName}'
          AND table_type = 'BASE TABLE'`;
  }

  const regex3 =
    /SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, POSITION FROM TABLE_COLUMNS WHERE SCHEMA_NAME='(.*?)' AND TABLE_NAME='(.*?)' GROUP BY TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, POSITION ORDER BY POSITION/;
  if (temp.match(regex3)) {
    const [, schemaName, tableName] = regex3.exec(temp);
    return `
        SELECT table_name AS "TABLE_NAME",
            column_name AS "COLUMN_NAME",
            UPPER(udt_name) AS "DATA_TYPE_NAME",
            ordinal_position AS "POSITION"
        FROM information_schema.columns
        WHERE table_schema = '${schemaName}'
            AND table_name = '${tableName}'
        GROUP BY table_name,
            column_name,
            udt_name,
            ordinal_position
        ORDER BY ordinal_position`;
  }

  temp = temp.replace(/FLAG 'i'/gi, "");

  temp = temp.replace(
    /YEAR\(CURRENT_DATE\)/gi,
    `date_part('year', current_date)`,
  );

  temp = temp.replace(
    "CREATE LOCAL TEMPORARY COLUMN TABLE",
    "CREATE TEMPORARY TABLE",
  );

  // remove multiple spaces
  temp = temp.replace(/\s+/g, " ");

  temp = temp.replace(
    /ADD_SECONDS\(([\w]+)\,([0-9]+)\)/g,
    `$1 + interval\'$2 seconds\'`,
  );
  // Replace CURRENT_UTCTIMESTAMP with timezone('utc', now())
  temp = temp.replace(/CURRENT_UTCTIMESTAMP/gi, "timezone('utc', now())");
  // Remove FROM DUMMY
  temp = temp.replace(/FROM DUMMY/gi, "");

  // Replace TABLE_COLUMNS with information_schema.columns
  temp = temp.replace(
    /COLUMN_NAME FROM TABLE_COLUMNS WHERE SCHEMA_NAME/gi,
    `COLUMN_NAME AS "COLUMN_NAME" from information_schema.columns where table_schema`,
  );
  temp = temp.replace(
    /COLUMN_NAME as "value" FROM TABLE_COLUMNS WHERE SCHEMA_NAME/gi,
    `COLUMN_NAME AS "value" from information_schema.columns where table_schema`,
  );
  // Replace VIEW_COLUMNS with pg_attribute
  temp = temp.replace(
    /COLUMN_NAME as \"value\" FROM VIEW_COLUMNS WHERE SCHEMA_NAME = (\%s|\?) AND VIEW_NAME = (\%s|\?)/gi,
    "attname as value from pg_attribute WHERE  attrelid = concat(%s::text, '.\"', %s::text, '\"')::regclass",
  );
  temp = temp.replace(
    /COLUMN_NAME FROM VIEW_COLUMNS WHERE SCHEMA_NAME = (\%s|\?) AND VIEW_NAME = (\%s|\?)/gi,
    "attname as \"COLUMN_NAME\" from pg_attribute WHERE  attrelid = concat(%s::text, '.\"', %s::text, '\"')::regclass",
  );
  // Query is not parameterized, persist the values in use
  temp = temp.replace(
    /DATA_TYPE_NAME as dataType from TABLE_COLUMNS WHERE TABLE_NAME = (\'[\w.::]*\') AND COLUMN_NAME/gi,
    `data_type as \"dataType\" from information_schema.columns where table_schema=$1 and column_name`,
  );
  temp = temp.replace(
    /data_type_name as dataType FROM VIEW_COLUMNS where VIEW_NAME = (\'[\w.::]*\') and column_name/gi,
    `format_type(atttypid, atttypmod) as \"dataType\" from pg_attribute WHERE attrelid = (SELECT oid FROM pg_class WHERE relname = $1) and attname`,
  );

  temp = temp.replace(
    /SELECT DISTINCT COLUMN_NAME AS BASIC_TYPE, 'PATIENT' AS origin, DATA_TYPE_NAME as DATATYPE FROM VIEW_COLUMNS WHERE VIEW_NAME=(\'[\w.::]*\')/gi,
    `select distinct attname as \"BASIC_TYPE\", 'PATIENT' AS origin, format_type(atttypid, atttypmod) as \"DATATYPE\" FROM pg_attribute where attrelid= (SELECT oid FROM pg_class WHERE relname = $1)`,
  );

  // Replace TABLES, VIEWS with PG_TABLES and PG_VIEWS
  temp = temp.replace(
    /SELECT COUNT\(\*\) AS tableCount from tables where schema_name=(\%s|\?) and table_name=(\%s|\?)/gi,
    `select count(*) as "tableCount" from pg_tables where schemaname=%s and tablename=%s`,
  );
  temp = temp.replace(
    /SELECT COUNT\(\*\) AS tableCount from views where schema_name=(\%s|\?) and view_name=(\%s|\?)/gi,
    `select count(*) as "tableCount" from pg_views where schemaname=%s and viewname=%s`,
  );

  // Replace Upsert with Insert On Conflict
  temp = temp.replace(
    `/UPSERT \"legacy\.config\.db\.models::Configuration\.Config\" \(\"Id\", \"Version\", \"Status\", \"Name\", \"Type\", \"ParentId\", \"ParentVersion\", \"Creator\", \"Created\", \"Modifier\", \"Modified\", \"Data\"\) VALUES \(\'MRI\/PA\/FHIRSCHEMA\', %s, \'FHIR Schema\', \'MRI\/PA\/FHIRSCHEMA\', \'\', \'\', \'\', \'\', \'\', \'\', \'\', TO_NCLOB\(%s\)\) WHERE \"Id\" = \'MRI\/PA\/FHIRSCHEMA\' AND \"Version\" = %s/ig`,
    `INSERT INTO "ConfigDbModels_Config" ("Id", "Version", "Status", "Name", "Type",
      "ParentId", "ParentVersion", "Creator", "Created", "Modifier", "Modified",
      "Data") VALUES ('MRI/PA/FHIRSCHEMA', %s, 'FHIR Schema', 'MRI/PA/FHIRSCHEMA', '', '', '',
      '', '', '', '', TO_NCLOB(%s)) on
      conflict (WHERE "Id" = 'MRI/PA/FHIRSCHEMA' AND "Version" = %s) do
      update "ConfigDbModels_Config"
      set "Id"='MRI/PA/FHIRSCHEMA' , "Version"=$1 , "Status"='FHIR Schema' , "Name"='MRI/PA/FHIRSCHEMA' , "Type"='' ,
     "ParentId"='' , "ParentVersion"='' ,
      "Creator"='' , "Created"='' , "Modifier"='' , "Modified"='' , "Data"=$2`,
  );

  // Replace CONTAINS with LIKE and Remove FUZZY
  temp = temp.replace(
    /WHERE CONTAINS\(([\w\.]+), ([\%\w]+), FUZZY\(([\%\s\w\,\'\=]+|[\%\s\w]+)\)\)/gi,
    `WHERE $1 LIKE $2`,
  );

  // Replace sequence nextval calls
  temp = temp.replace(/(\w+).(\w+).nextval/gi, `nextval('$1.$2')`);

  // Remove SNIPPETS
  temp = temp.replace(/SNIPPETS\(([\w\.]+)\)/g, `$1`);

  temp = temp.replace(/SCORE\(\)/gi, `'NA'`);
  // Replace Top 1 with Limit 1
  temp = temp.replace(/select Top 1 (.*)/gi, `SELECT $1 Limit 1`);

  temp = temp.replace(/(\w+[.{1}])(\"[\w]*\").nextval/gi, `nextval('$1$2')`);


  // Replace
  temp = temp.replace(/TO_NCLOB/gi, "");
  temp = temp.replace(/TO_TIMESTAMP\(TO_VARCHAR\(([\w_]*)(.*?\)){2}/gi, "$1::varchar::timestamp");
  temp = temp.replace(/TO_TIMESTAMP\(([\w$_%?]*)(.*?\))/gi, "$1::timestamp");
  temp = temp.replace(/TO_DATE\(([\w$_%?]*)(.*?\))/gi, "$1::date");
  temp = temp.replace(/TO_VARCHAR(\(\"[\w]*\"\))/gi, "$1::varchar"); // Only for TO_VARCHAR that uses one parameter
  temp = temp.replace(/TO_VARCHAR/gi, "");
  // temp = temp.replace(/TO_INTEGER\(([^\*]*)\)\ \*/ig, "($1)::integer *");
  temp = temp.replace(/TO_INTEGER(\(\"[\w]*\"\))/gi, "$1::integer");
  temp = temp.replace(/TO_BIGINT(\(\"[\w]*\"\))/gi, "$1::bigint");
  temp = temp.replace(/TO_DOUBLE(\(\"[\w]*\"\))/gi, "$1::double precision");
  temp = temp.replace(/TO_DECIMAL(\([\w]*\))/gi, "$1::decimal");
  temp = temp.replace(/UPPER(\([\"\w.]{2,}\))/gi, "UPPER($1::varchar)");
  temp = temp.replace(/to_nvarchar/gi, "");
  temp = temp.replace(/nvarchar/gi, "VARCHAR");
  temp = temp.replace(/\(SYSUUID\)/gi, "uuid_generate_v4()");
  temp = temp.replace(/IFNULL/gi, "COALESCE");

  temp = temp.replace(/\$\$SCHEMA\$\$./g, `"${schemaName}".`);
  temp = temp.replace(/\$\$VOCAB_SCHEMA\$\$./g, `"${vocabSchemaName}".`);

  return temp;
};

export const translateHanaToPostgres = (temp: string, schemaName: string, vocabSchemaName: string) => {
  temp = hanaCommonTranslation(temp, schemaName, vocabSchemaName);
  temp = temp.replace(/LIKE_REGEXPR/gi, "~*"); // ~* short for regex, case insensitive matching
  temp = temp.replace(
    /DAYS_BETWEEN \(\(\(("[\w]*"."[\w]*")\)\),\(\(("[\w]*"."[\w]*")\)\)\)/gi,
    `($2::date - $1::date)`,
  );

  // Replace %s or `?` with $n
  let n = 0;
  temp = temp.replace(/\%[s]{1}(?![a-zA-Z0-9%])|%UNSAFE|\?/g, () => {
    return "$" + ++n;
  });

  return temp;
};

export const translateHanaToDuckdb = (
  temp: string,
  schemaName: string,
  vocabSchemaName: string,
  parameters?: ParameterInterface[],
): string => {
  temp = temp.replace(
      /\$\$SCHEMA\$\$.COHORT_DEFINITION/g,
      `direct_db_conn.${schemaName}.COHORT_DEFINITION`
    );
  temp = temp.replace(
      /\$\$SCHEMA\$\$.COHORT/g,
      `direct_db_conn.${schemaName}.COHORT`
  );

  temp = hanaCommonTranslation(temp, schemaName, vocabSchemaName);
  
  temp = temp.replace(/\$\$SCHEMA_DIRECT_CONN\$\$./g, `direct_db_conn.${schemaName}.`); // Used when using cachedb connection connecting to duckdb, but additionally requires direct connection to database schema

  temp = temp.replace(/DAYS_BETWEEN \(/gi, `date_diff ('day', `);
  temp = temp.replace(
    /select count\(\*\) as \"TABLECOUNT\" from pg_tables where schemaname=(\%s|\?|\$[0-9]) and tablename=(\%s|\?|\$[0-9])/gi,
    `select count(*) AS tableCount from information_schema.tables where table_catalog=%s and table_name=%s`,
  )
  temp = temp.replace(
    /select count\(\*\) as \"TABLECOUNT\" from pg_views where schemaname=(\%s|\?|\$[0-9]) and viewname=(\%s|\?|\$[0-9])/gi,
    `select count(*) AS tableCount from duckdb_views where database_name=%s and view_name=%s`,
  )

  // Replace %s or `?` with $n
  let n = 0;
  temp = temp.replace(/\%[s]{1}(?![a-zA-Z0-9%])|%UNSAFE|\?/g, () => {
    return "$" + ++n;
  });

  // Should be placed at the end after ? is replaced with $n
  if (parameters?.length) {
    const paramsRegex = /\$(\d+)/g;
    temp = temp.replace(paramsRegex, (match: string, paramNumber: string) => {
      const paramIndex = Number(paramNumber) - 1;
      if (parameters[paramIndex].type === "time") {
        return `CAST($${paramNumber} AS DATE)`;
      }
      if (parameters[paramIndex].type === "datetime") {
        return `CAST($${paramNumber} AS TIMESTAMP)`;
      }
      return match;
    });
  }
  return temp;
};
