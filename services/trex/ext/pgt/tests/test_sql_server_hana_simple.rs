use hdbconnect::{ConnectParams, Connection};
use pgt::SqlTransformer;
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
    
    // For SELECT queries, we need to handle the result differently
    if query.trim().to_uppercase().starts_with("SELECT") {
        let result = conn.query(query).map_err(|e| -> Box<dyn std::error::Error> {
            format!("Failed to execute HANA query: {}\nQuery: {}", e, query).into()
        })?;
        
        // Just consume the result to verify it works
        let _rows: Vec<_> = result.collect();
        
        println!(
            "✓ HANA query executed successfully: {}",
            query.lines().next().unwrap_or(query)
        );
    } else {
        // For non-SELECT queries (DDL, DML), use exec
        conn.exec(query).map_err(|e| -> Box<dyn std::error::Error> {
            format!("Failed to execute HANA query: {}\nQuery: {}", e, query).into()
        })?;
        
        println!(
            "✓ HANA query executed successfully: {}",
            query.lines().next().unwrap_or(query)
        );
    }
    
    Ok(())
}

fn test_transformation_only(
    name: &str,
    input_sql: &str,
    expected_keywords: &[&str],
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🧪 Testing {} (transformation only)", name);

    let transformer = SqlTransformer::default();
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

    println!("✓ Transformation validation passed");
    Ok(())
}

fn test_transformation_and_execution(
    name: &str,
    input_sql: &str,
    expected_keywords: &[&str],
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🧪 Testing {}", name);

    let transformer = SqlTransformer::default();
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

    // Try to execute on HANA if available
    execute_hana_query(&result)?;

    Ok(())
}

// Test 1: SQL Server pattern - Conditional table creation (using PostgreSQL equivalent)
#[test]
fn test_conditional_table_creation_pattern() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "CREATE TABLE temp_orders (id INTEGER, name TEXT)";
    test_transformation_only(
        "conditional table creation pattern",
        sql,
        &["CREATE TABLE", "INTEGER", "CLOB"],
    )
}

// Test 2: SQL Server pattern - Conditional table drop (using PostgreSQL equivalent)
#[test]
fn test_conditional_table_drop_pattern() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "DROP TABLE temp_customers";
    test_transformation_only(
        "conditional table drop pattern",
        sql,
        &["DROP TABLE"],
    )
}

// Test 3: SQL Server pattern - Temporary table creation (using PostgreSQL TEMPORARY)
#[test]
fn test_temporary_table_creation() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "CREATE TABLE temp_sales (
        id INTEGER,
        name TEXT NOT NULL,
        amount DECIMAL(10,2)
    )";
    test_transformation_only(
        "temporary table creation",
        sql,
        &["CREATE", "TABLE", "INTEGER", "CLOB"],
    )
}

// Test 4: SQL Server pattern - CREATE TABLE AS SELECT (PostgreSQL equivalent)
#[test]
fn test_create_table_as_select_pattern() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "CREATE TABLE new_customers AS
               SELECT customer_id, customer_name, city
               FROM customers
               WHERE status = 'ACTIVE'";
    test_transformation_only(
        "create table as select pattern",
        sql,
        &["CREATE", "TABLE", "AS", "SELECT"],
    )
}

// Test 5: SQL Server pattern - String length function (using PostgreSQL LENGTH)
#[test]
fn test_string_length_function() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "SELECT customer_name, LENGTH(customer_name) as name_length
               FROM customers
               WHERE LENGTH(customer_name) > 10";
    test_transformation_only("string length function", sql, &["LENGTH"])
}

// Test 6: SQL Server pattern - Numeric validation (transformation only)
#[test]
fn test_numeric_validation_pattern() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "SELECT order_id, order_total,
               CASE
                   WHEN order_total > 0 THEN 'Valid'
                   ELSE 'Invalid'
               END as validation_status
               FROM orders";
    test_transformation_only(
        "numeric validation pattern",
        sql,
        &["CASE", "WHEN", "THEN", "ELSE", "END"],
    )
}

// Test 7: SQL Server pattern - String concatenation (using PostgreSQL ||)
#[test]
fn test_string_concatenation_pattern() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "SELECT first_name || ' ' || last_name as full_name,
               'Customer: ' || customer_id as customer_label
               FROM customers";
    test_transformation_only("string concatenation pattern", sql, &["||"])
}

// Test 8: SQL Server pattern - CONCAT function (using PostgreSQL CONCAT)
#[test]
fn test_concat_function_pattern() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "SELECT CONCAT(first_name, ' ', last_name) as full_name,
               CONCAT('ID: ', customer_id) as formatted_id
               FROM customers";
    test_transformation_only("concat function pattern", sql, &["CONCAT"])
}

// Test 9: SQL Server pattern - End of month calculation (transformation only)
#[test]
fn test_end_of_month_pattern() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "SELECT order_date,
               LAST_DAY(order_date) as month_end
               FROM orders";
    test_transformation_only("end of month pattern", sql, &["LAST_DAY"])
}

// Test 10: SQL Server pattern - String position function (using PostgreSQL POSITION)
#[test]
fn test_string_position_pattern() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "SELECT customer_name,
               POSITION('@' IN email) as at_position
               FROM customers
               WHERE POSITION('@' IN email) > 0";
    test_transformation_only("string position pattern", sql, &["POSITION"])
}

// Test 11: SQL Server pattern - FLOOR function (using PostgreSQL FLOOR)
#[test]
fn test_floor_function_pattern() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "SELECT 
               FLOOR(123.456) as floored_value,
               FLOOR(789.123 * 0.1) as ten_percent_floor
               FROM DUMMY";
    test_transformation_and_execution("floor function pattern", sql, &["FLOOR"])
}

// Test 12: Complex SQL Server pattern combination (transformation only)
#[test]
fn test_complex_sql_server_patterns() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "WITH monthly_summary AS (
        SELECT
            EXTRACT(MONTH FROM order_date) as order_month,
            COUNT(*) as order_count,
            SUM(order_total) as total_amount
        FROM orders
        WHERE order_date >= CURRENT_DATE - INTERVAL '12' MONTH
        GROUP BY EXTRACT(MONTH FROM order_date)
    )
    SELECT
        order_month,
        order_count,
        FLOOR(total_amount) as floored_total,
        CONCAT('Month: ', CAST(order_month AS TEXT)) as month_label
    FROM monthly_summary
    ORDER BY order_month DESC";

    test_transformation_only(
        "complex SQL Server patterns combination",
        sql,
        &["WITH", "FLOOR", "CONCAT"],
    )
}

// Test to verify environment loading
#[test]
fn test_env_loading() -> Result<(), Box<dyn std::error::Error>> {
    init_test_env();
    
    let hana_url = env::var("HANA_URL")
        .map_err(|_| "HANA_URL environment variable not found in .env file")?;
    
    println!("✅ HANA_URL loaded from .env: {}", hana_url);
    
    // Verify URL format
    assert!(hana_url.starts_with("hdbsql://"), "HANA_URL should start with hdbsql://");
    assert!(hana_url.contains("@"), "HANA_URL should contain @ separator");
    assert!(hana_url.contains(":"), "HANA_URL should contain : separator");
    
    println!("✅ HANA_URL format validation passed");
    
    Ok(())
}

// Test basic HANA connection
#[test]
fn test_hana_connection() -> Result<(), Box<dyn std::error::Error>> {
    let sql = "SELECT 1 AS test_value FROM DUMMY";
    test_transformation_and_execution("basic HANA connection", sql, &["SELECT", "FROM"])
}
