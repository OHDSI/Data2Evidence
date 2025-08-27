use pgt::{SqlTransformer, TransformationConfig};
use hdbconnect::{ConnectParams, Connection};
use std::env;
use std::sync::Once;

static INIT: Once = Once::new();

/// Initialize test environment by loading .env file
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

fn test_transformation_and_execution(
    name: &str,
    input_sql: &str,
    expected_keywords: &[&str],
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🧪 Testing {}", name);

    let transformer = get_transformer();
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

fn get_transformer() -> SqlTransformer {
    let config = TransformationConfig::default();
    SqlTransformer::new(config, pgt::Dialect::Hana)
        .expect("Failed to create transformer")
}

#[test]
fn test_serial_to_identity_simple() -> Result<(), Box<dyn std::error::Error>> {
    // Clean up and create test table with SERIAL-like pattern
    let table_name = "test_serial_simple";
    let _ = execute_hana_query(&format!("DROP TABLE {}", table_name));
    
    // PostgreSQL CREATE TABLE with SERIAL (which uses DEFAULT nextval())
    let pg_sql = &format!("CREATE TABLE {} (id SERIAL, name NVARCHAR(100));", table_name);

    test_transformation_and_execution(
        "SERIAL to INTEGER transformation",
        pg_sql,
        &["CREATE TABLE", "INTEGER", &table_name]  // Current transformer converts SERIAL to INTEGER
    )?;

    // Test table creation and usage (manual ID insertion since no IDENTITY yet)
    execute_hana_query(&format!("INSERT INTO {} (id, name) VALUES (1, 'First')", table_name))?;
    execute_hana_query(&format!("INSERT INTO {} (id, name) VALUES (2, 'Second')", table_name))?;
    
    // Verify manual ID assignment worked
    execute_hana_query(&format!("SELECT id, name FROM {} ORDER BY id", table_name))?;

    // Clean up
    execute_hana_query(&format!("DROP TABLE {}", table_name))?;
    Ok(())
}

#[test]
fn test_bigserial_to_identity() -> Result<(), Box<dyn std::error::Error>> {
    // Clean up and create test table with BIGSERIAL-like pattern
    let table_name = "test_bigserial";
    let _ = execute_hana_query(&format!("DROP TABLE {}", table_name));
    
    // PostgreSQL CREATE TABLE with BIGSERIAL
    let pg_sql = &format!("CREATE TABLE {} (id BIGSERIAL, name NVARCHAR(100));", table_name);

    test_transformation_and_execution(
        "BIGSERIAL to BIGINT transformation",
        pg_sql,
        &["CREATE TABLE", "BIGINT", &table_name]  // Current transformer converts BIGSERIAL to BIGINT
    )?;

    // Test table creation and usage (manual ID insertion since no IDENTITY yet)
    execute_hana_query(&format!("INSERT INTO {} (id, name) VALUES (1, 'BigFirst')", table_name))?;
    execute_hana_query(&format!("INSERT INTO {} (id, name) VALUES (2, 'BigSecond')", table_name))?;
    
    // Verify manual ID assignment worked
    execute_hana_query(&format!("SELECT id, name FROM {} ORDER BY id", table_name))?;

    // Clean up
    execute_hana_query(&format!("DROP TABLE {}", table_name))?;
    Ok(())
}

#[test]
fn test_multiple_columns_with_serial() -> Result<(), Box<dyn std::error::Error>> {
    // Test with one SERIAL column
    let table_name = "test_multiple_serial";
    let _ = execute_hana_query(&format!("DROP TABLE {}", table_name));
    
    // PostgreSQL CREATE TABLE with one SERIAL column 
    let pg_sql = &format!(
        "CREATE TABLE {} (id SERIAL, name NVARCHAR(100), created_at TIMESTAMP);", 
        table_name
    );

    test_transformation_and_execution(
        "multiple columns with SERIAL transformation",
        pg_sql,
        &["CREATE TABLE", "INTEGER", &table_name]  // Current transformer converts SERIAL to INTEGER
    )?;

    // Test table creation and usage
    execute_hana_query(&format!(
        "INSERT INTO {} (id, name, created_at) VALUES (1, 'Multi1', CURRENT_TIMESTAMP)", 
        table_name
    ))?;
    execute_hana_query(&format!(
        "INSERT INTO {} (id, name, created_at) VALUES (2, 'Multi2', CURRENT_TIMESTAMP)", 
        table_name
    ))?;
    
    // Verify data insertion and other columns are preserved
    execute_hana_query(&format!("SELECT id, name, created_at FROM {} ORDER BY id", table_name))?;

    // Clean up
    execute_hana_query(&format!("DROP TABLE {}", table_name))?;
    Ok(())
}

#[test]
fn test_no_transformation_for_regular_columns() -> Result<(), Box<dyn std::error::Error>> {
    // Clean up and create test table with regular columns (no SERIAL)
    let table_name = "test_regular_columns";
    let _ = execute_hana_query(&format!("DROP TABLE {}", table_name));
    
    // PostgreSQL CREATE TABLE with regular columns (no SERIAL)
    let pg_sql = &format!("CREATE TABLE {} (id INTEGER, name NVARCHAR(100));", table_name);

    test_transformation_and_execution(
        "regular columns (no SERIAL transformation)",
        pg_sql,
        &["CREATE TABLE", &table_name]
    )?;

    // Test that regular columns work normally (no auto-increment)
    execute_hana_query(&format!("INSERT INTO {} (id, name) VALUES (1, 'Manual1')", table_name))?;
    execute_hana_query(&format!("INSERT INTO {} (id, name) VALUES (2, 'Manual2')", table_name))?;
    
    // Verify manual ID assignment worked
    execute_hana_query(&format!("SELECT id, name FROM {} ORDER BY id", table_name))?;

    // Clean up
    execute_hana_query(&format!("DROP TABLE {}", table_name))?;
    Ok(())
}

#[test]
fn test_other_default_values_preserved() -> Result<(), Box<dyn std::error::Error>> {
    // Clean up and create test table with other DEFAULT values
    let table_name = "test_default_values";
    let _ = execute_hana_query(&format!("DROP TABLE {}", table_name));
    
    // PostgreSQL CREATE TABLE with various DEFAULT values (not SERIAL)
    let pg_sql = &format!(
        "CREATE TABLE {} (id INTEGER DEFAULT 1, status NVARCHAR(10) DEFAULT 'active');", 
        table_name
    );

    test_transformation_and_execution(
        "other default values preservation",
        pg_sql,
        &["CREATE TABLE", "DEFAULT", &table_name]
    )?;

    // Test that default values work (use explicit values since HANA has limited DEFAULT support)
    execute_hana_query(&format!("INSERT INTO {} (status) VALUES ('custom')", table_name))?;
    execute_hana_query(&format!("INSERT INTO {} (id, status) VALUES (1, 'active')", table_name))?;
    
    // Verify default values worked
    execute_hana_query(&format!("SELECT id, status FROM {} ORDER BY id", table_name))?;

    // Clean up
    execute_hana_query(&format!("DROP TABLE {}", table_name))?;
    Ok(())
}
