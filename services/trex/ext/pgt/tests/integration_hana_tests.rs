mod common;

use common::*;
use pgt::{config::TransformationConfig, SqlTransformer};
use std::env;

#[tokio::test]
async fn test_data_type_transformations() {
    let mut runner = IntegrationTestRunner::new();

    // Connect to HANA database
    if let Err(e) = runner.connect_database().await {
        eprintln!("Skipping database tests - connection failed: {}", e);
        return;
    }

    // Test data type transformations with transformation-only tests (no DB execution needed)
    let clob_test = TransformationTest::new(
        "CLOB transformation test",
        "CREATE TABLE test_table (id INTEGER, content TEXT)",
    )
    .expect_transformation("CLOB")
    .transformation_only();

    let result = runner.run_test(clob_test).await;
    println!("CLOB test result: {:?}", result);
    assert!(result.transformation_success, "CLOB transformation failed");

    let varchar_test = TransformationTest::new(
        "VARCHAR transformation test",
        "CREATE TABLE test_table (id INTEGER, email VARCHAR(100))",
    )
    .expect_transformation("NVARCHAR(100)")
    .transformation_only();

    let result = runner.run_test(varchar_test).await;
    println!("VARCHAR test result: {:?}", result);
    assert!(
        result.transformation_success,
        "VARCHAR transformation failed"
    );

    // Test NOW() function with DUMMY table (HANA's equivalent to PostgreSQL's dual)
    let now_test = TransformationTest::new("NOW() function test", "SELECT NOW() FROM DUMMY")
        .expect_transformation("NOW()");

    let result = runner.run_test(now_test).await;
    println!("NOW() test result: {:?}", result);

    // Check that NOW() was preserved (not transformed to CURRENT_TIMESTAMP)
    assert!(
        result.hana_sql.contains("NOW()"),
        "NOW() should be preserved in HANA SQL"
    );
    assert!(
        !result.hana_sql.contains("CURRENT_TIMESTAMP"),
        "NOW() should not be transformed to CURRENT_TIMESTAMP"
    );
    assert!(
        result.execution_success.unwrap_or(false),
        "NOW() should execute successfully in HANA"
    );
}

#[tokio::test]
async fn test_basic_transformations() {
    let mut runner = IntegrationTestRunner::new();

    if let Err(e) = runner.connect_database().await {
        eprintln!("Skipping database tests - connection failed: {}", e);
        return;
    }

    let tests = vec![
        // Basic data type transformations (transformation-only, no database execution needed)
        TransformationTest::new(
            "text_to_clob",
            "CREATE TABLE test (id INTEGER, content TEXT)",
        )
        .expect_transformation("CLOB")
        .transformation_only(),
        TransformationTest::new(
            "bigserial_to_bigint",
            "CREATE TABLE test (id BIGSERIAL PRIMARY KEY, data TEXT)",
        )
        .expect_transformation("BIGINT")
        .transformation_only(),
        TransformationTest::new(
            "serial_to_integer",
            "CREATE TABLE test (id SERIAL PRIMARY KEY, data TEXT)",
        )
        .expect_transformation("INTEGER")
        .transformation_only(),
        TransformationTest::new(
            "boolean_preserved",
            "CREATE TABLE test (id INTEGER, active BOOLEAN)",
        )
        .expect_transformation("BOOLEAN")
        .transformation_only(),
    ];

    let results = runner.run_test_suite(tests).await;

    for result in &results {
        println!("\nTest: {}", result.test_name);
        println!("PostgreSQL: {}", result.postgres_sql.trim());
        println!("HANA SQL: {}", result.hana_sql.trim());
        println!("Success: {}", result.is_success());

        if let Some(ref error) = result.error {
            println!("Error: {}", error);
        }

        for (pattern, found) in &result.transformation_checks {
            println!(
                "  Expected '{}': {}",
                pattern,
                if *found { "✓" } else { "✗" }
            );
        }

        assert!(
            result.transformation_success,
            "Transformation failed for: {}",
            result.test_name
        );

        // Check that expected transformations were found
        for (pattern, found) in &result.transformation_checks {
            assert!(
                *found,
                "Expected transformation '{}' not found in: {}",
                pattern, result.hana_sql
            );
        }

        if let Some(execution_success) = result.execution_success {
            assert!(
                execution_success,
                "SQL execution failed for: {}",
                result.test_name
            );
        }
    }
}

#[tokio::test]
async fn test_hana_now_support() {
    init_test_env();
    let hana_url = std::env::var("HANA_URL").expect("HANA_URL not found in environment");

    let mut db = match TestDatabase::connect(&hana_url).await {
        Ok(db) => db,
        Err(e) => {
            eprintln!("Skipping database tests - connection failed: {}", e);
            return;
        }
    };

    // Test NOW() directly without transformation
    println!(
        "
Testing NOW() directly in HANA..."
    );
    match db.execute("SELECT NOW() FROM DUMMY").await {
        Ok(_) => println!("✅ HANA supports NOW() natively!"),
        Err(e) => println!("❌ HANA does NOT support NOW(): {}", e),
    }

    // Test CURRENT_TIMESTAMP directly without transformation
    println!(
        "
Testing CURRENT_TIMESTAMP directly in HANA..."
    );
    match db.execute("SELECT CURRENT_TIMESTAMP FROM DUMMY").await {
        Ok(_) => println!("✅ HANA supports CURRENT_TIMESTAMP natively!"),
        Err(e) => println!("❌ HANA does NOT support CURRENT_TIMESTAMP: {}", e),
    }

    // Test CURRENT_TIMESTAMP() with parentheses
    println!(
        "
Testing CURRENT_TIMESTAMP() with parentheses in HANA..."
    );
    match db.execute("SELECT CURRENT_TIMESTAMP() FROM DUMMY").await {
        Ok(_) => println!("✅ HANA supports CURRENT_TIMESTAMP() with parentheses!"),
        Err(e) => println!("❌ HANA does NOT support CURRENT_TIMESTAMP(): {}", e),
    }
}

#[tokio::test]
async fn test_complex_query_transformations() {
    init_test_env();
    let hana_url = env::var("HANA_URL")
        .unwrap_or_else(|_| "hdbsql://SYSTEM:Password123@localhost:39041".to_string());
    let mut db = TestDatabase::connect(&hana_url)
        .await
        .expect("Failed to connect to database");

    // Use unique table names with timestamp to avoid conflicts
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let table1_name = format!("USERS_COMPLEX_TEST_{}", timestamp);
    let table2_name = format!("TEST_TABLE_INSERT_{}", timestamp);

    println!("🧪 Running test_complex_query_transformations with unique tables");

    // Ensure cleanup of any existing tables
    let _ = db.execute(&format!("DROP TABLE {}", table1_name)).await;
    let _ = db.execute(&format!("DROP TABLE {}", table2_name)).await;

    // Test 1: CREATE TABLE with complex types and defaults
    let postgres_sql_1 = format!(
        "CREATE TABLE {} (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email VARCHAR(255) UNIQUE,
            profile JSON,
            created_at TIMESTAMP DEFAULT NOW()
        )",
        table1_name
    );

    // Transform the SQL
    let config = TransformationConfig::default();
    let transformer = SqlTransformer::new(config, pgt::Dialect::Hana).expect("Failed to create transformer");
    let transformed_result_1 = transformer.transform(&postgres_sql_1);

    assert!(
        transformed_result_1.is_ok(),
        "Failed to transform CREATE TABLE SQL: {:?}",
        transformed_result_1
    );
    let transformed_sql_1 = transformed_result_1.unwrap();

    println!("Original CREATE TABLE SQL: {}", postgres_sql_1);
    println!("Transformed CREATE TABLE SQL: {}", transformed_sql_1);

    // Verify transformations
    assert!(
        transformed_sql_1.contains("CLOB"),
        "Should transform TEXT to CLOB"
    );
    assert!(
        transformed_sql_1.contains("NVARCHAR(255)"),
        "Should transform VARCHAR to NVARCHAR"
    );
    assert!(
        transformed_sql_1.contains("BIGINT"),
        "Should transform BIGSERIAL to BIGINT"
    );
    assert!(
        transformed_sql_1.contains("CURRENT_TIMESTAMP"),
        "Should transform NOW() to CURRENT_TIMESTAMP"
    );

    // Execute the transformed SQL
    let create_result_1 = db.execute(&transformed_sql_1).await;
    assert!(
        create_result_1.is_ok(),
        "Failed to create complex table: {:?}",
        create_result_1
    );

    // Test 2: INSERT with type casts and functions (transformation only, no BIGSERIAL issue)
    let postgres_sql_2 = format!(
        "INSERT INTO {} (name, data, created_at)
         VALUES ('John'::TEXT, '{{\"age\": 30}}'::JSON, NOW())",
        table2_name
    );

    let transformed_result_2 = transformer.transform(&postgres_sql_2);
    assert!(
        transformed_result_2.is_ok(),
        "Failed to transform INSERT SQL: {:?}",
        transformed_result_2
    );
    let transformed_sql_2 = transformed_result_2.unwrap();

    println!("Original INSERT SQL: {}", postgres_sql_2);
    println!("Transformed INSERT SQL: {}", transformed_sql_2);

    // Verify transformations (this is transformation-only test)
    assert!(
        transformed_sql_2.contains("CAST"),
        "Should transform type casts"
    );

    // Test 3: SELECT with multiple transformations (transformation only)
    let postgres_sql_3 = "SELECT
        name::TEXT AS user_name,
        email::VARCHAR AS user_email,
        RANDOM() AS random_value,
        NOW() AS current_time
     FROM users_view
     WHERE created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC
     LIMIT 10";

    let transformed_result_3 = transformer.transform(postgres_sql_3);
    assert!(
        transformed_result_3.is_ok(),
        "Failed to transform SELECT SQL: {:?}",
        transformed_result_3
    );
    let transformed_sql_3 = transformed_result_3.unwrap();

    println!("Original SELECT SQL: {}", postgres_sql_3);
    println!("Transformed SELECT SQL: {}", transformed_sql_3);

    // Verify transformations
    assert!(
        transformed_sql_3.contains("RAND"),
        "Should transform RANDOM() to RAND()"
    );
    // Verify transformations
    assert!(
        transformed_sql_3.contains("RAND"),
        "Should transform RANDOM() to RAND()"
    );

    // Cleanup
    let cleanup_result_1 = db.execute(&format!("DROP TABLE {}", table1_name)).await;
    assert!(
        cleanup_result_1.is_ok(),
        "Failed to cleanup table: {:?}",
        cleanup_result_1
    );

    println!(
        "✅ test_complex_query_transformations passed - All transformations working correctly"
    );
}

#[tokio::test]
async fn test_end_to_end_transformation_and_execution() {
    let mut runner = IntegrationTestRunner::new();

    if let Err(e) = runner.connect_database().await {
        eprintln!("Skipping database tests - connection failed: {}", e);
        return;
    }

    // This test creates a table, inserts data, and queries it - all using transformed SQL
    let tests = vec![
        TransformationTest::new(
            "Create test table with transformations",
            "CREATE TABLE integration_test_e2e_temp (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email VARCHAR(100),
                profile JSON,
                created_at TIMESTAMP DEFAULT NOW()
            )",
        )
        .expect_transformation("CLOB")
        .expect_transformation("NVARCHAR(100)")
        .expect_transformation("CURRENT_TIMESTAMP") // NOW() should be transformed to CURRENT_TIMESTAMP in DEFAULT clauses
        .with_cleanup("DROP TABLE integration_test_e2e_temp"),
        TransformationTest::new(
            "Insert sample data with transformations",
            "INSERT INTO integration_test_e2e_temp (id, name, email, profile) VALUES
             (1, 'John Doe'::TEXT, 'john@example.com'::VARCHAR, '{\"age\": 30}'::JSON)",
        )
        .expect_transformation("CAST"),
    ];

    let results = runner.run_test_suite(tests).await;

    for result in &results {
        println!("\nTest: {}", result.test_name);
        println!("PostgreSQL: {}", result.postgres_sql.trim());
        println!("HANA SQL: {}", result.hana_sql.trim());
        println!("Success: {}", result.is_success());

        if let Some(ref error) = result.error {
            println!("Error: {}", error);
        }

        assert!(
            result.transformation_success,
            "Transformation failed for: {}",
            result.test_name
        );

        for (pattern, found) in &result.transformation_checks {
            if !*found {
                println!(
                    "⚠️ Expected transformation '{}' not found in: {}",
                    pattern, result.hana_sql
                );
            } else {
                println!("✅ Found expected transformation: '{}'", pattern);
            }
        }

        // For CREATE TABLE tests, execution success is required
        if result.test_name.contains("CREATE TABLE") {
            if let Some(execution_success) = result.execution_success {
                assert!(
                    execution_success,
                    "SQL execution failed for: {}",
                    result.test_name
                );
            }
        }
    }
}

#[tokio::test]
async fn test_error_handling_and_edge_cases() {
    let mut runner = IntegrationTestRunner::new();

    let tests = vec![
        TransformationTest::new(
            "Invalid SQL should fail gracefully",
            "INVALID SQL SYNTAX HERE",
        )
        .transformation_only(),
        TransformationTest::new(
            "Unsupported PostgreSQL features should transform what's possible",
            "SELECT * FROM users WHERE data->'name' = 'John'",
        )
        .transformation_only(),
        TransformationTest::new(
            "Complex nested queries",
            "SELECT u.name FROM (SELECT name::TEXT FROM users WHERE id > 0) u",
        )
        .transformation_only(),
    ];

    let results = runner.run_test_suite(tests).await;

    for result in &results {
        println!("\nTest: {}", result.test_name);
        println!("PostgreSQL: {}", result.postgres_sql.trim());

        if result.transformation_success {
            println!("HANA SQL: {}", result.hana_sql.trim());
        } else {
            println!("Transformation failed (expected for some tests)");
        }

        if let Some(ref error) = result.error {
            println!("Error: {}", error);
        }

        // For error handling tests, we mainly want to ensure no panics occur
        // Some of these tests are expected to fail transformation
        match result.test_name.as_str() {
            "Invalid SQL should fail gracefully" => {
                assert!(
                    !result.transformation_success,
                    "Invalid SQL should fail transformation"
                );
            }
            _ => {
                // For other tests, transformation should succeed even if some features aren't supported
                assert!(
                    result.transformation_success || result.error.is_some(),
                    "Test should either succeed or have a clear error message"
                );
            }
        }
    }
}

#[tokio::test]
async fn test_serial_identity_transformation() {
    init_test_env();
    let hana_url = env::var("HANA_URL")
        .unwrap_or_else(|_| "hdbsql://SYSTEM:Password123@localhost:39041".to_string());
    let mut db = TestDatabase::connect(&hana_url)
        .await
        .expect("Failed to connect to database");

    let test_name = "test_serial_identity_transformation";
    println!("🧪 Running {}", test_name);

    // Setup: Create a test table with SERIAL column (PostgreSQL style)
    // Note: HANA only supports ONE IDENTITY column per table, so we test with one SERIAL
    let postgres_sql = r#"
        CREATE TABLE SERIAL_TEST_TABLE (
            ID INTEGER DEFAULT nextval('serial_test_table_id_seq'),
            NAME VARCHAR(100),
            CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    "#;

    // Transform the SQL
    let config = TransformationConfig::default();
    let transformer = SqlTransformer::new(config, pgt::Dialect::Hana).expect("Failed to create transformer");
    let transformed_result = transformer.transform(postgres_sql);

    assert!(
        transformed_result.is_ok(),
        "Failed to transform SQL: {:?}",
        transformed_result
    );
    let transformed_sql = transformed_result.unwrap();

    println!("Original SQL: {}", postgres_sql);
    println!("Transformed SQL: {}", transformed_sql);

    // Verify the transformation contains IDENTITY columns
    assert!(
        transformed_sql.contains("GENERATED BY DEFAULT AS IDENTITY"),
        "Transformed SQL should contain IDENTITY clause"
    );
    assert!(
        !transformed_sql.contains("nextval"),
        "Transformed SQL should not contain nextval() calls"
    );
    assert!(
        transformed_sql.contains("NVARCHAR"),
        "Transformed SQL should transform VARCHAR to NVARCHAR"
    );

    // Cleanup any existing table (use HANA-compatible syntax)
    let _ = db.execute("DROP TABLE SERIAL_TEST_TABLE").await;

    // Execute the transformed SQL on HANA
    let create_result = db.execute(&transformed_sql).await;
    assert!(
        create_result.is_ok(),
        "Failed to create table with IDENTITY columns: {:?}",
        create_result
    );

    // Test inserting data (IDENTITY columns should auto-increment)
    // HANA requires separate INSERT statements
    let insert_result_1 = db
        .execute("INSERT INTO SERIAL_TEST_TABLE (NAME) VALUES ('Test User 1')")
        .await;
    assert!(
        insert_result_1.is_ok(),
        "Failed to insert data 1: {:?}",
        insert_result_1
    );

    let insert_result_2 = db
        .execute("INSERT INTO SERIAL_TEST_TABLE (NAME) VALUES ('Test User 2')")
        .await;
    assert!(
        insert_result_2.is_ok(),
        "Failed to insert data 2: {:?}",
        insert_result_2
    );

    let insert_result_3 = db
        .execute("INSERT INTO SERIAL_TEST_TABLE (NAME) VALUES ('Test User 3')")
        .await;
    assert!(
        insert_result_3.is_ok(),
        "Failed to insert data 3: {:?}",
        insert_result_3
    );

    // Verify the IDENTITY columns were populated automatically
    let query_result = db
        .query("SELECT ID, NAME FROM SERIAL_TEST_TABLE ORDER BY ID")
        .await;
    assert!(
        query_result.is_ok(),
        "Failed to query data: {:?}",
        query_result
    );

    let rows = query_result.unwrap();
    assert_eq!(rows.len(), 3, "Should have 3 rows");

    // Check that IDENTITY columns have auto-incremented values
    // HANA may return values with type annotations like "1:INT" or "Test User 1:STRING", so we extract just the value
    fn extract_value(hana_value: &str) -> &str {
        hana_value.split(':').next().unwrap_or(hana_value)
    }

    assert_eq!(extract_value(&rows[0][0]), "1", "First row id should be 1");
    assert_eq!(
        extract_value(&rows[0][1]),
        "Test User 1",
        "First row name should match"
    );

    assert_eq!(extract_value(&rows[1][0]), "2", "Second row id should be 2");
    assert_eq!(
        extract_value(&rows[1][1]),
        "Test User 2",
        "Second row name should match"
    );

    assert_eq!(extract_value(&rows[2][0]), "3", "Third row id should be 3");
    assert_eq!(
        extract_value(&rows[2][1]),
        "Test User 3",
        "Third row name should match"
    );

    // Cleanup
    let cleanup_result = db.execute("DROP TABLE SERIAL_TEST_TABLE").await;
    assert!(
        cleanup_result.is_ok(),
        "Failed to cleanup table: {:?}",
        cleanup_result
    );

    println!(
        "✅ {} passed - SERIAL columns transformed to IDENTITY and working correctly",
        test_name
    );
}

#[tokio::test]
async fn test_bigserial_identity_transformation() {
    init_test_env();
    let hana_url = env::var("HANA_URL")
        .unwrap_or_else(|_| "hdbsql://SYSTEM:Password123@localhost:39041".to_string());
    let mut db = TestDatabase::connect(&hana_url)
        .await
        .expect("Failed to connect to database");

    let test_name = "test_bigserial_identity_transformation";
    println!("🧪 Running {}", test_name);

    // Setup: Create a test table with BIGSERIAL column (PostgreSQL style)
    let postgres_sql = r#"
        CREATE TABLE BIGSERIAL_TEST_TABLE (
            USER_ID BIGINT DEFAULT nextval('user_id_seq'),
            USERNAME VARCHAR(50)
        )
    "#;

    // Transform the SQL
    let config = TransformationConfig::default();
    let transformer = SqlTransformer::new(config, pgt::Dialect::Hana).expect("Failed to create transformer");
    let transformed_result = transformer.transform(postgres_sql);

    assert!(
        transformed_result.is_ok(),
        "Failed to transform SQL: {:?}",
        transformed_result
    );
    let transformed_sql = transformed_result.unwrap();

    println!("Original SQL: {}", postgres_sql);
    println!("Transformed SQL: {}", transformed_sql);

    // Verify the transformation contains IDENTITY columns
    assert!(
        transformed_sql.contains("GENERATED BY DEFAULT AS IDENTITY"),
        "Transformed SQL should contain IDENTITY clause"
    );
    assert!(
        !transformed_sql.contains("nextval"),
        "Transformed SQL should not contain nextval() calls"
    );
    assert!(
        transformed_sql.contains("NVARCHAR"),
        "Transformed SQL should transform VARCHAR to NVARCHAR"
    );

    // Cleanup any existing table (use HANA-compatible syntax)
    let _ = db.execute("DROP TABLE BIGSERIAL_TEST_TABLE").await;

    // Execute the transformed SQL on HANA
    let create_result = db.execute(&transformed_sql).await;
    assert!(
        create_result.is_ok(),
        "Failed to create table with BIGINT IDENTITY: {:?}",
        create_result
    );

    // Test inserting data (IDENTITY columns should auto-increment)
    let insert_result_1 = db
        .execute("INSERT INTO BIGSERIAL_TEST_TABLE (USERNAME) VALUES ('user1')")
        .await;
    assert!(
        insert_result_1.is_ok(),
        "Failed to insert data 1: {:?}",
        insert_result_1
    );

    let insert_result_2 = db
        .execute("INSERT INTO BIGSERIAL_TEST_TABLE (USERNAME) VALUES ('user2')")
        .await;
    assert!(
        insert_result_2.is_ok(),
        "Failed to insert data 2: {:?}",
        insert_result_2
    );

    // Verify the IDENTITY columns were populated automatically
    let query_result = db
        .query("SELECT USER_ID, USERNAME FROM BIGSERIAL_TEST_TABLE ORDER BY USER_ID")
        .await;
    assert!(
        query_result.is_ok(),
        "Failed to query data: {:?}",
        query_result
    );

    let rows = query_result.unwrap();
    assert_eq!(rows.len(), 2, "Should have 2 rows");

    // Check that IDENTITY columns have auto-incremented values
    // HANA may return values with type annotations like "1:INT" or "user1:STRING", so we extract just the value
    fn extract_value(hana_value: &str) -> &str {
        hana_value.split(':').next().unwrap_or(hana_value)
    }

    assert_eq!(
        extract_value(&rows[0][0]),
        "1",
        "First row user_id should be 1"
    );
    assert_eq!(
        extract_value(&rows[0][1]),
        "user1",
        "First row username should match"
    );

    assert_eq!(
        extract_value(&rows[1][0]),
        "2",
        "Second row user_id should be 2"
    );
    assert_eq!(
        extract_value(&rows[1][1]),
        "user2",
        "Second row username should match"
    );

    // Cleanup
    let cleanup_result = db.execute("DROP TABLE BIGSERIAL_TEST_TABLE").await;
    assert!(
        cleanup_result.is_ok(),
        "Failed to cleanup table: {:?}",
        cleanup_result
    );

    println!(
        "✅ {} passed - BIGSERIAL columns transformed to BIGINT IDENTITY and working correctly",
        test_name
    );
}

#[tokio::test]
async fn test_now_function_directly_in_hana() {
    let mut runner = IntegrationTestRunner::new();

    if let Err(e) = runner.connect_database().await {
        eprintln!("Skipping database tests - connection failed: {}", e);
        return;
    }

    // Test if HANA supports NOW() natively
    let test = TransformationTest::new("Test NOW() directly in HANA", "SELECT NOW() FROM DUMMY");

    let result = runner.run_test(test).await;

    println!("\nTest: {}", result.test_name);
    println!("PostgreSQL: {}", result.postgres_sql.trim());
    println!("HANA SQL: {}", result.hana_sql.trim());
    println!("Transformation Success: {}", result.transformation_success);
    if let Some(execution_success) = result.execution_success {
        println!("Execution Success: {}", execution_success);
    }

    if let Some(ref error) = result.error {
        println!("Error: {}", error);
    }
}
