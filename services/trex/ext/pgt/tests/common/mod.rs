use hdbconnect::{Connection, HdbResult};
use pgt::{SqlTransformer, TransformationConfig};
use std::env;
use std::sync::Once;

static INIT: Once = Once::new();

/// Initialize test environment by loading .env file
pub fn init_test_env() {
    INIT.call_once(|| {
        dotenv::dotenv().ok();
        env_logger::init();
    });
}

/// Test configuration for integration tests
pub struct TestConfig {
    pub hana_url: String,
    pub transformer: SqlTransformer,
}

impl TestConfig {
    pub fn new() -> Self {
        init_test_env();

        let hana_url =
            env::var("HANA_URL").expect("HANA_URL environment variable must be set in .env file");

        let config = TransformationConfig::default();
        let transformer = SqlTransformer::new(config, pgt::Dialect::Hana)
            .expect("Failed to create transformer");

        Self {
            hana_url,
            transformer,
        }
    }
}

/// Database connection wrapper for tests
pub struct TestDatabase {
    connection: Connection,
}

impl TestDatabase {
    pub async fn connect(hana_url: &str) -> HdbResult<Self> {
        let connection = Connection::new(hana_url)?;
        Ok(Self { connection })
    }

    pub async fn execute(&mut self, sql: &str) -> HdbResult<()> {
        match self.connection.multiple_statements(vec![sql]) {
            Ok(_) => Ok(()),
            Err(e) => {
                eprintln!("HANA Database Error Details:");
                eprintln!("SQL: {}", sql);
                eprintln!("Error: {:?}", e);
                Err(e)
            }
        }
    }

    pub async fn query(&mut self, sql: &str) -> HdbResult<Vec<Vec<String>>> {
        let result_set = self.connection.query(sql)?;
        let mut rows = Vec::new();

        for row in result_set {
            let row = row?;
            let mut string_row = Vec::new();
            for value in row.into_iter() {
                string_row.push(format!("{:?}", value));
            }
            rows.push(string_row);
        }

        Ok(rows)
    }

    pub async fn table_exists(&mut self, table_name: &str) -> HdbResult<bool> {
        let sql = format!(
            "SELECT COUNT(*) FROM SYS.TABLES WHERE SCHEMA_NAME = CURRENT_SCHEMA AND TABLE_NAME = '{}'",
            table_name.to_uppercase()
        );

        let rows = self.query(&sql).await?;
        if let Some(row) = rows.first() {
            if let Some(count_str) = row.first() {
                let count: i32 = count_str.trim_matches('"').parse().unwrap_or(0);
                return Ok(count > 0);
            }
        }

        Ok(false)
    }

    pub async fn drop_table_if_exists(&mut self, table_name: &str) -> HdbResult<()> {
        if self.table_exists(table_name).await? {
            let drop_sql = format!("DROP TABLE {}", table_name);
            self.execute(&drop_sql).await?;
        }
        Ok(())
    }

    pub async fn safe_cleanup(&mut self, cleanup_sql: &str) -> HdbResult<()> {
        // For DROP TABLE statements, check if table exists first
        if cleanup_sql.to_uppercase().starts_with("DROP TABLE") {
            // Extract table name from "DROP TABLE table_name"
            let parts: Vec<&str> = cleanup_sql.split_whitespace().collect();
            if parts.len() >= 3 {
                let table_name = parts[2];
                return self.drop_table_if_exists(table_name).await;
            }
        }

        // For other cleanup statements, just execute directly
        self.execute(cleanup_sql).await
    }
}

/// Test case structure for transformation validation
#[derive(Debug)]
pub struct TransformationTest {
    pub name: String,
    pub postgres_sql: String,
    pub expected_transformations: Vec<String>,
    pub should_execute: bool,
    pub setup_sql: Option<String>,
    pub cleanup_sql: Option<String>,
}

impl TransformationTest {
    pub fn new(name: impl Into<String>, postgres_sql: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            postgres_sql: postgres_sql.into(),
            expected_transformations: Vec::new(),
            should_execute: true,
            setup_sql: None,
            cleanup_sql: None,
        }
    }

    pub fn expect_transformation(mut self, pattern: impl Into<String>) -> Self {
        self.expected_transformations.push(pattern.into());
        self
    }

    pub fn with_setup(mut self, setup_sql: impl Into<String>) -> Self {
        self.setup_sql = Some(setup_sql.into());
        self
    }

    pub fn with_cleanup(mut self, cleanup_sql: impl Into<String>) -> Self {
        self.cleanup_sql = Some(cleanup_sql.into());
        self
    }

    pub fn transformation_only(mut self) -> Self {
        self.should_execute = false;
        self
    }
}

/// Test result structure
#[derive(Debug)]
pub struct TestResult {
    pub test_name: String,
    pub postgres_sql: String,
    pub hana_sql: String,
    pub transformation_success: bool,
    pub execution_success: Option<bool>,
    pub error: Option<String>,
    pub transformation_checks: Vec<(String, bool)>,
}

impl TestResult {
    pub fn is_success(&self) -> bool {
        self.transformation_success
            && self.execution_success.unwrap_or(true)
            && self.transformation_checks.iter().all(|(_, result)| *result)
    }
}

/// Integration test runner
pub struct IntegrationTestRunner {
    config: TestConfig,
    database: Option<TestDatabase>,
}

impl IntegrationTestRunner {
    pub fn new() -> Self {
        Self {
            config: TestConfig::new(),
            database: None,
        }
    }

    pub async fn connect_database(&mut self) -> HdbResult<()> {
        let db = TestDatabase::connect(&self.config.hana_url).await?;
        self.database = Some(db);
        Ok(())
    }

    pub async fn run_test(&mut self, test: TransformationTest) -> TestResult {
        let mut result = TestResult {
            test_name: test.name.clone(),
            postgres_sql: test.postgres_sql.clone(),
            hana_sql: String::new(),
            transformation_success: false,
            execution_success: None,
            error: None,
            transformation_checks: Vec::new(),
        };

        // Transform SQL
        match self.config.transformer.transform(&test.postgres_sql) {
            Ok(hana_sql) => {
                result.hana_sql = hana_sql;
                result.transformation_success = true;

                // Check expected transformations
                for expected in &test.expected_transformations {
                    let found = result.hana_sql.contains(expected);
                    result.transformation_checks.push((expected.clone(), found));
                }

                // Execute on database if requested
                if test.should_execute && self.database.is_some() {
                    result.execution_success = Some(false);

                    if let Some(ref mut db) = self.database {
                        // Run setup SQL if provided
                        if let Some(ref setup_sql) = test.setup_sql {
                            // Try to clean up any existing tables first
                            if setup_sql.to_uppercase().contains("CREATE TABLE") {
                                // Extract table name and try to drop it first
                                if let Some(start) = setup_sql.to_uppercase().find("CREATE TABLE") {
                                    let after_create = &setup_sql[start + 13..];
                                    if let Some(table_name) = after_create.split_whitespace().next()
                                    {
                                        let _ = db
                                            .safe_cleanup(&format!("DROP TABLE {}", table_name))
                                            .await;
                                    }
                                }
                            }

                            match db.execute(setup_sql).await {
                                Ok(_) => println!("Setup SQL executed successfully"),
                                Err(e) => {
                                    result.error = Some(format!("Setup failed: {}", e));
                                    return result;
                                }
                            }
                        }

                        // For CREATE TABLE tests, try to clean up the table first
                        if result.hana_sql.to_uppercase().contains("CREATE TABLE") {
                            if let Some(start) = result.hana_sql.to_uppercase().find("CREATE TABLE")
                            {
                                let after_create = &result.hana_sql[start + 13..];
                                if let Some(table_name) = after_create.split_whitespace().next() {
                                    let _ = db
                                        .safe_cleanup(&format!("DROP TABLE {}", table_name))
                                        .await;
                                }
                            }
                        }

                        // Execute transformed SQL
                        match db.execute(&result.hana_sql).await {
                            Ok(_) => {
                                result.execution_success = Some(true);
                                println!("SQL executed successfully: {}", result.hana_sql.trim());
                            }
                            Err(e) => {
                                result.error = Some(format!("Execution failed: {}", e));
                                println!("SQL execution failed: {}", result.hana_sql.trim());
                            }
                        }

                        // Run cleanup SQL if provided
                        if let Some(ref cleanup_sql) = test.cleanup_sql {
                            if let Err(cleanup_err) = db.safe_cleanup(cleanup_sql).await {
                                eprintln!("Warning: Cleanup failed: {}", cleanup_err);
                                // Don't fail the test for cleanup errors, just log them
                            }
                        }
                    }
                }
            }
            Err(e) => {
                result.error = Some(format!("Transformation failed: {}", e));
            }
        }

        result
    }

    pub async fn run_test_suite(&mut self, tests: Vec<TransformationTest>) -> Vec<TestResult> {
        let mut results = Vec::new();

        for test in tests {
            let result = self.run_test(test).await;
            results.push(result);
        }

        results
    }
}
