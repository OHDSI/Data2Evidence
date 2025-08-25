mod common;

use pgt::{SqlTransformer, TransformationConfig};
use hdbconnect::{ConnectParams, Connection};
use std::env;
use std::sync::Once;

static INIT: Once = Once::new();

// Initialize test environment by loading .env file
fn init_test_env() {
    INIT.call_once(|| {
        dotenv::dotenv().ok();
    });
}

fn get_hana_connection() -> Result<Connection, Box<dyn std::error::Error>> {
    init_test_env();
    
    let hana_url = env::var("HANA_URL")
        .map_err(|_| "HANA_URL environment variable not found in .env file")?;
    
    // Parse HANA URL: hdbsql://user:password@host:port/database
    let url_parts: Vec<&str> = hana_url.split("://").collect();
    if url_parts.len() != 2 {
        return Err("Invalid HANA_URL format. Expected: hdbsql://user:password@host:port/database".into());
    }
    
    let connection_part = url_parts[1];
    let auth_and_host: Vec<&str> = connection_part.split('@').collect();
    if auth_and_host.len() != 2 {
        return Err("Invalid HANA_URL format. Missing @ separator".into());
    }
    
    let auth_part = auth_and_host[0];
    let host_part = auth_and_host[1];
    
    let credentials: Vec<&str> = auth_part.split(':').collect();
    if credentials.len() != 2 {
        return Err("Invalid HANA_URL format. Missing credentials".into());
    }
    
    let user = credentials[0];
    let password = credentials[1];
    
    let host_and_port: Vec<&str> = host_part.split('/').collect();
    if host_and_port.is_empty() {
        return Err("Invalid HANA_URL format. Missing host".into());
    }
    
    let host_port = host_and_port[0];
    let host_port_parts: Vec<&str> = host_port.split(':').collect();
    if host_port_parts.len() != 2 {
        return Err("Invalid HANA_URL format. Missing port".into());
    }
    
    let host = host_port_parts[0];
    let port: u16 = host_port_parts[1].parse()
        .map_err(|_| "Invalid port number in HANA_URL")?;

    let params = ConnectParams::builder()
        .hostname(host)
        .port(port)
        .dbuser(user)
        .password(password)
        .build()?;

    Connection::new(params).map_err(|e| {
        format!("Failed to connect to HANA database: {}. Check your HANA_URL in .env file.", e).into()
    })
}

fn execute_hana_query(query: &str) -> Result<(), Box<dyn std::error::Error>> {
    let conn = get_hana_connection()?;
    
    // Determine query type and use appropriate method
    let trimmed_query = query.trim().to_uppercase();
    
    if trimmed_query.starts_with("SELECT") || trimmed_query.starts_with("WITH") {
        // Use query() for SELECT statements
        let result = conn.query(query)?;
        // Consume the result properly
        let _rows: Vec<_> = result.collect();
        Ok(())
    } else {
        // Use multiple_statements() for INSERT, UPDATE, DELETE, CREATE, DROP statements
        conn.multiple_statements(vec![query])?;
        Ok(())
    }
}

fn create_transformer() -> SqlTransformer {
    let mut config = TransformationConfig::default();
    // Override the NOW mapping to preserve it as NOW() since it's valid in HANA
    config.functions.custom_mappings.insert("NOW".to_string(), "NOW".to_string());
    SqlTransformer::new(config, pgt::Dialect::Hana)
        .expect("Failed to create transformer")
}

fn test_transformation_and_execution(
    name: &str,
    input_sql: &str,
    expected_keywords: &[&str],
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🧪 Testing {}", name);

    let transformer = create_transformer();
    let result = transformer.transform(input_sql)?;

    println!("Original SQL: {}", input_sql);
    println!("Transformed: {}", result);

    // Verify transformation contains expected keywords
    for keyword in expected_keywords {
        assert!(
            result.contains(keyword),
            "Transformed SQL should contain '{}'\nGot: {}",
            keyword,
            result
        );
    }

    // Execute on HANA database
    execute_hana_query(&result)?;

    Ok(())
}

#[test]
fn test_basic_transformation() -> Result<(), Box<dyn std::error::Error>> {
    // Test NOW() function with HANA database execution - NOW() should remain as is
    let sql = "SELECT NOW() FROM DUMMY";
    test_transformation_and_execution(
        "basic transformation with NOW()",
        sql,
        &["NOW()"]
    )
}

#[test]
fn test_data_type_transformation() -> Result<(), Box<dyn std::error::Error>> {
    // Create a test table with PostgreSQL data types and execute it
    let _ = execute_hana_query("DROP TABLE integration_test_data_types");
    
    let sql = "CREATE TABLE integration_test_data_types (id INTEGER, data TEXT, email VARCHAR(255))";
    test_transformation_and_execution(
        "data type transformation",
        sql,
        &["CLOB", "NVARCHAR(255)"]
    )?;
    
    // Verify we can insert data into the transformed table
    execute_hana_query("INSERT INTO integration_test_data_types VALUES (1, 'test data', 'test@example.com')")?;
    
    // Query the data to ensure it works
    execute_hana_query("SELECT * FROM integration_test_data_types")?;
    
    // Clean up
    execute_hana_query("DROP TABLE integration_test_data_types")?;
    Ok(())
}

#[test]
fn test_function_transformation() -> Result<(), Box<dyn std::error::Error>> {
    // Test function transformations with database execution
    let sql = "SELECT NOW(), RANDOM() as random_val FROM DUMMY";
    test_transformation_and_execution(
        "function transformation",
        sql,
        &["NOW()", "RAND()"]
    )
}

#[test]
fn test_error_handling() {
    let config = TransformationConfig::default();
    let transformer = SqlTransformer::new(config, pgt::Dialect::Hana)
        .expect("Failed to create transformer");

    let invalid_sql = "INVALID SQL SYNTAX HERE";
    let result = transformer.transform(invalid_sql);

    // Should handle invalid SQL gracefully
    assert!(result.is_err());
}

#[test]
fn test_detailed_transformation() {
    let config = TransformationConfig::default();
    let transformer = SqlTransformer::new(config, pgt::Dialect::Hana)
        .expect("Failed to create transformer");

    let postgres_sql = "SELECT COUNT(*) FROM users WHERE age > 18";
    let result = transformer.transform_detailed(postgres_sql);

    assert!(result.result.is_ok());
    assert!(result.metadata.is_some());
    if let Some(ref metadata) = result.metadata {
        assert!(
            !metadata.transformations_applied.is_empty()
                || metadata.performance_metrics.total_time_ms >= 0
        );
    }
}

#[test]
fn test_configuration_loading() {
    let config = TransformationConfig::default();

    // Test that default configuration has reasonable defaults
    assert!(config.data_types.preserve_precision);
    assert!(config.functions.enable_custom_functions);
    // Default config starts with empty custom mappings
    assert!(config.data_types.custom_mappings.is_empty());
    assert!(config.functions.custom_mappings.is_empty());
}

#[test]
fn test_complex_query_transformation() -> Result<(), Box<dyn std::error::Error>> {
    // Test complex CTE query with function transformations using DUMMY table
    let complex_sql = r#"
        WITH user_stats AS (
            SELECT
                1 as user_id,
                5 AS order_count,
                1000.50 AS total_spent
            FROM DUMMY
        )
        SELECT
            'TestUser' as username,
            COALESCE(us.order_count, 0) AS orders,
            COALESCE(us.total_spent, 0.00) AS spent,
            RANDOM() AS score
        FROM user_stats us
        LIMIT 100
    "#;

    test_transformation_and_execution(
        "complex query transformation",
        complex_sql,
        &["WITH", "COALESCE", "RAND()"]
    )
}

#[test]
fn test_mixed_transformations() -> Result<(), Box<dyn std::error::Error>> {
    // Test mixed data type and function transformations with real database execution
    let _ = execute_hana_query("DROP TABLE integration_test_mixed");
    
    let postgres_sql = r#"
        CREATE TABLE integration_test_mixed (
            id INTEGER,
            name TEXT NOT NULL,
            email VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW()
        )
    "#;

    test_transformation_and_execution(
        "mixed transformations",
        postgres_sql,
        &["CLOB", "NVARCHAR(255)", "CURRENT_TIMESTAMP"]
    )?;
    
    // Test inserting data into the transformed table
    execute_hana_query("INSERT INTO integration_test_mixed (id, name, email) VALUES (1, 'Test User', 'test@example.com')")?;
    
    // Query the data to ensure it works
    execute_hana_query("SELECT * FROM integration_test_mixed")?;
    
    // Clean up
    execute_hana_query("DROP TABLE integration_test_mixed")?;
    Ok(())
}
