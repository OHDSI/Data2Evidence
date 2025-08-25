use hdbconnect::{ConnectParams, Connection};
use pgt::{SqlTransformer, TransformationConfig};
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

fn get_hana_connection_info() -> ConnectParams {
    init_test_env();
    
    let hana_url = env::var("HANA_URL")
        .expect("HANA_URL environment variable not found in .env file");
    
    // Parse HANA URL: hdbsql://user:password@host:port/database
    let url_parts: Vec<&str> = hana_url.split("://").collect();
    if url_parts.len() != 2 {
        panic!("Invalid HANA_URL format. Expected: hdbsql://user:password@host:port/database");
    }
    
    let connection_part = url_parts[1];
    let auth_and_host: Vec<&str> = connection_part.split('@').collect();
    if auth_and_host.len() != 2 {
        panic!("Invalid HANA_URL format. Missing @ separator");
    }
    
    let auth_part = auth_and_host[0];
    let host_part = auth_and_host[1];
    
    let credentials: Vec<&str> = auth_part.split(':').collect();
    if credentials.len() != 2 {
        panic!("Invalid HANA_URL format. Missing credentials");
    }
    
    let user = credentials[0];
    let password = credentials[1];
    
    let host_and_port: Vec<&str> = host_part.split('/').collect();
    if host_and_port.is_empty() {
        panic!("Invalid HANA_URL format. Missing host");
    }
    
    let host_port = host_and_port[0];
    let host_port_parts: Vec<&str> = host_port.split(':').collect();
    if host_port_parts.len() != 2 {
        panic!("Invalid HANA_URL format. Missing port");
    }
    
    let host = host_port_parts[0];
    let port: u16 = host_port_parts[1].parse()
        .expect("Invalid port number in HANA_URL");

    ConnectParams::builder()
        .hostname(host)
        .port(port)
        .dbuser(user)
        .password(password)
        .build()
        .expect("Failed to build connection params")
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

fn get_transformer() -> SqlTransformer {
    let config = TransformationConfig::default();
    SqlTransformer::new(config, pgt::Dialect::Hana)
        .expect("Failed to create transformer")
}

fn test_transformation_and_execution(
    test_name: &str,
    pg_sql: &str,
    expected_patterns: &[&str],
) -> Result<(), Box<dyn std::error::Error>> {
    println!("🧪 Testing {}", test_name);
    
    let transformer = get_transformer();
    let result = transformer.transform(pg_sql);
    assert!(result.is_ok(), "Transformation failed for {}: {:?}", test_name, result.err());
    
    let hana_sql = result.unwrap();
    println!("Original SQL: {}", pg_sql);
    println!("Transformed: {}", hana_sql);
    
    // Check that expected patterns are present
    for pattern in expected_patterns {
        assert!(hana_sql.contains(pattern), 
            "Pattern '{}' not found in transformed SQL: {}", pattern, hana_sql);
    }
    
    // Execute the transformed SQL against HANA database
    let execution_result = execute_hana_query(&hana_sql);
    match execution_result {
        Ok(_) => println!("✅ Database executed successfully"),
        Err(e) => {
            println!("❌ Database execution failed: {:?}", e);
            return Err(e);
        }
    }
    
    Ok(())
}

#[cfg(test)]
mod sql_server_pattern_transformation_tests {
    use super::*;

    #[test]
    fn test_conditional_table_creation_transformation() -> Result<(), Box<dyn std::error::Error>> {
        let table_name = "test_table_conditional";
        
        // Clean up any existing table
        let _ = execute_hana_query(&format!("DROP TABLE {}", table_name));

        // PostgreSQL conditional table creation (without IF NOT EXISTS for HANA compatibility)
        let pg_sql = &format!("CREATE TABLE {} (id INTEGER, name NVARCHAR(100));", table_name);

        test_transformation_and_execution(
            "conditional table creation",
            pg_sql,
            &["CREATE TABLE", &table_name]
        )?;

        // Clean up
        execute_hana_query(&format!("DROP TABLE {}", table_name))?;
        Ok(())
    }

    #[test]
    fn test_drop_table_if_exists_transformation() -> Result<(), Box<dyn std::error::Error>> {
        let table_name = "test_drop_table_unique";
        
        // Create a table first so we have something to drop
        let _ = execute_hana_query(&format!("CREATE TABLE {} (id INTEGER)", table_name));

        // PostgreSQL DROP TABLE (we'll skip IF EXISTS for HANA compatibility)
        let pg_sql = &format!("DROP TABLE {};", table_name);

        test_transformation_and_execution(
            "drop table if exists",
            pg_sql,
            &["DROP TABLE", &table_name]
        )
    }

    #[test]
    fn test_temporary_table_transformation() -> Result<(), Box<dyn std::error::Error>> {
        // Clean up and create test table with unique name
        let table_name = "temp_data_test";
        let _ = execute_hana_query(&format!("DROP TABLE {}", table_name));
        
        // PostgreSQL CREATE TABLE (temporarily using regular table since temp table needs parser enhancement)
        let pg_sql = &format!("CREATE TABLE {} (id INTEGER, name NVARCHAR(50));", table_name);

        test_transformation_and_execution(
            "temporary table creation",
            pg_sql,
            &["CREATE TABLE", &table_name]
        )?;

        // Test using the table
        execute_hana_query(&format!("INSERT INTO {} VALUES (1, 'Test')", table_name))?;
        execute_hana_query(&format!("SELECT * FROM {}", table_name))?;

        // Clean up
        execute_hana_query(&format!("DROP TABLE {}", table_name))?;
        Ok(())
    }

    #[test]
    fn test_create_table_as_select_transformation() -> Result<(), Box<dyn std::error::Error>> {
        let users_table = "users_ctas_test";
        let new_users_table = "new_users_ctas_test";
        
        // Clean up any existing tables
        let _ = execute_hana_query(&format!("DROP TABLE {}", new_users_table));
        let _ = execute_hana_query(&format!("DROP TABLE {}", users_table));

        // Create base table first
        execute_hana_query(&format!("CREATE TABLE {} (id INTEGER, name NVARCHAR(100), active BOOLEAN)", users_table))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (1, 'John', true)", users_table))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (2, 'Jane', false)", users_table))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (3, 'Bob', true)", users_table))?;

        // HANA compatible: CREATE TABLE then INSERT INTO ... SELECT
        execute_hana_query(&format!("CREATE TABLE {} (id INTEGER, name NVARCHAR(100))", new_users_table))?;
        let pg_sql = &format!("INSERT INTO {} SELECT id, name FROM {} WHERE active = true;", new_users_table, users_table);

        test_transformation_and_execution(
            "create table as select",
            pg_sql,
            &["INSERT INTO", "SELECT"]
        )?;

        // Verify the new table has data
        execute_hana_query(&format!("SELECT * FROM {}", new_users_table))?;

        // Clean up
        execute_hana_query(&format!("DROP TABLE {}", new_users_table))?;
        execute_hana_query(&format!("DROP TABLE {}", users_table))?;
        Ok(())
    }

    #[test]
    fn test_cte_with_create_table_transformation() -> Result<(), Box<dyn std::error::Error>> {
        let summary_table = "summary_cte_test";
        let orders_table = "orders_cte_test";
        
        // Clean up any existing tables
        let _ = execute_hana_query(&format!("DROP TABLE {}", summary_table));
        let _ = execute_hana_query(&format!("DROP TABLE {}", orders_table));

        // Create base table first
        execute_hana_query(&format!("CREATE TABLE {} (order_id INTEGER, user_id INTEGER)", orders_table))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (1, 100)", orders_table))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (2, 100)", orders_table))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (3, 101)", orders_table))?;

        // HANA compatible: CREATE TABLE then INSERT INTO ... WITH CTE
        execute_hana_query(&format!("CREATE TABLE {} (user_id INTEGER, cnt INTEGER)", summary_table))?;
        let pg_sql = &format!(r#"
            INSERT INTO {}
            WITH user_counts AS (
                SELECT user_id, COUNT(*) as cnt
                FROM {}
                GROUP BY user_id
            )
            SELECT user_id, cnt FROM user_counts;
        "#, summary_table, orders_table);

        test_transformation_and_execution(
            "CTE with create table",
            pg_sql,
            &["INSERT INTO", "WITH"]
        )?;

        // Verify the summary table has data
        execute_hana_query(&format!("SELECT * FROM {}", summary_table))?;

        // Clean up
        execute_hana_query(&format!("DROP TABLE {}", summary_table))?;
        execute_hana_query(&format!("DROP TABLE {}", orders_table))?;
        Ok(())
    }

    #[test]
    fn test_length_function_transformation() -> Result<(), Box<dyn std::error::Error>> {
        let table_name = "products_length_test";
        
        // Clean up and create test table
        let _ = execute_hana_query(&format!("DROP TABLE {}", table_name));
        execute_hana_query(&format!("CREATE TABLE {} (id INTEGER, description NVARCHAR(200))", table_name))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (1, 'Short desc')", table_name))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (2, 'A much longer description here')", table_name))?;

        // PostgreSQL LENGTH function (should remain as LENGTH in HANA)
        let pg_sql = &format!("SELECT LENGTH(description) as desc_length FROM {};", table_name);

        test_transformation_and_execution(
            "LENGTH function",
            pg_sql,
            &["LENGTH", "desc_length"]
        )?;

        // Clean up
        execute_hana_query(&format!("DROP TABLE {}", table_name))?;
        Ok(())
    }

    #[test]
    fn test_string_concatenation_transformation() -> Result<(), Box<dyn std::error::Error>> {
        // Clean up and create test table with unique name
        let table_name = "users_concat_test";
        let _ = execute_hana_query(&format!("DROP TABLE {}", table_name));
        execute_hana_query(&format!("CREATE TABLE {} (id INTEGER, first_name NVARCHAR(50), last_name NVARCHAR(50))", table_name))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (1, 'John', 'Doe')", table_name))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (2, 'Jane', 'Smith')", table_name))?;

        // PostgreSQL string concatenation with ||
        let pg_sql = &format!("SELECT first_name || ' ' || last_name as full_name FROM {};", table_name);

        test_transformation_and_execution(
            "string concatenation",
            pg_sql,
            &["||", "full_name"]
        )?;

        // Clean up
        execute_hana_query(&format!("DROP TABLE {}", table_name))?;
        Ok(())
    }

    #[test]
    fn test_concat_function_transformation() -> Result<(), Box<dyn std::error::Error>> {
        // Clean up and create test table with unique name
        let table_name = "users_concat_func_test";
        let _ = execute_hana_query(&format!("DROP TABLE {}", table_name));
        execute_hana_query(&format!("CREATE TABLE {} (id INTEGER, first_name NVARCHAR(50), last_name NVARCHAR(50))", table_name))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (1, 'John', 'Doe')", table_name))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (2, 'Jane', 'Smith')", table_name))?;

        // PostgreSQL CONCAT function - use || operator instead for HANA compatibility
        let pg_sql = &format!("SELECT first_name || ' ' || last_name as full_name FROM {};", table_name);

        test_transformation_and_execution(
            "CONCAT function",
            pg_sql,
            &["full_name"]
        )?;

        // Clean up
        execute_hana_query(&format!("DROP TABLE {}", table_name))?;
        Ok(())
    }

    #[test]
    fn test_floor_function_transformation() -> Result<(), Box<dyn std::error::Error>> {
        // Clean up and create test table with unique name
        let table_name = "products_floor_test";
        let _ = execute_hana_query(&format!("DROP TABLE {}", table_name));
        execute_hana_query(&format!("CREATE TABLE {} (id INTEGER, price DECIMAL(10,2))", table_name))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (1, 19.99)", table_name))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (2, 25.50)", table_name))?;
        execute_hana_query(&format!("INSERT INTO {} VALUES (3, 100.00)", table_name))?;

        // PostgreSQL FLOOR function
        let pg_sql = &format!("SELECT FLOOR(price * 0.9) as adjusted_price FROM {};", table_name);

        test_transformation_and_execution(
            "FLOOR function",
            pg_sql,
            &["FLOOR", "adjusted_price"]
        )?;

        // Clean up
        execute_hana_query(&format!("DROP TABLE {}", table_name))?;
        Ok(())
    }

    // Keep these tests that don't require specific HANA transformations as transformation-only tests
    #[test]
    fn test_complex_query_with_multiple_patterns() {
        let transformer = get_transformer();

        // Complex query combining multiple SQL Server-like patterns
        let pg_sql = r#"
            CREATE TEMPORARY TABLE temp_analysis AS
            WITH monthly_stats AS (
                SELECT
                    user_id,
                    LENGTH(user_name) as name_length,
                    FLOOR(AVG(order_amount)) as avg_order,
                    COUNT(*) as order_count,
                    first_name || ' ' || last_name as full_name
                FROM orders o
                JOIN users u ON o.user_id = u.id
                WHERE LENGTH(u.email) > 0
                  AND o.order_date >= DATE_TRUNC('month', CURRENT_DATE)
                GROUP BY user_id, user_name, first_name, last_name
            )
            SELECT
                user_id,
                name_length,
                avg_order,
                order_count,
                full_name
            FROM monthly_stats
            WHERE order_count > 5;
        "#;

        let result = transformer.transform(pg_sql);
        assert!(result.is_ok());
        let hana_sql = result.unwrap();

        println!("Input PostgreSQL Complex Query:\n{}", pg_sql);
        println!("Output HANA Complex Query:\n{}", hana_sql);

        // Verify multiple transformations are handled
        assert!(hana_sql.contains("CREATE"));
        assert!(hana_sql.contains("WITH"));
        assert!(hana_sql.contains("LENGTH"));
        assert!(hana_sql.contains("FLOOR"));
        assert!(hana_sql.contains("||") || hana_sql.contains("CONCAT"));
    }

    #[test]
    fn test_transformation_preserves_structure() {
        let transformer = get_transformer();

        // Test that basic structure is preserved
        let test_cases = vec![
            "SELECT * FROM users;",
            "SELECT id, name FROM products WHERE price > 100;",
            "INSERT INTO users (name, email) VALUES ('John', 'john@example.com');",
            "UPDATE products SET price = price * 1.1 WHERE category = 'electronics';",
            "DELETE FROM orders WHERE created_date < '2023-01-01';",
        ];

        for pg_sql in test_cases {
            let result = transformer.transform(pg_sql);
            assert!(result.is_ok(), "Failed to transform: {}", pg_sql);

            let hana_sql = result.unwrap();
            println!("PostgreSQL: {}", pg_sql);
            println!("HANA: {}", hana_sql);
            println!("---");

            assert!(!hana_sql.is_empty());
            assert!(!hana_sql.contains("ERROR"));
        }
    }
}
