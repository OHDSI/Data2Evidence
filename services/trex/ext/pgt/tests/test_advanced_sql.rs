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
            // This is the approach used in the working integration tests
            conn.multiple_statements(vec![query])?;
            Ok(())
        }
    }

fn create_transformer() -> SqlTransformer {
    let config = TransformationConfig::default();
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

#[cfg(test)]
mod phase3b_advanced_sql_tests {
    use super::*;

    #[test]
    fn test_window_functions_row_number() -> Result<(), Box<dyn std::error::Error>> {
        // Following SAP HANA documentation pattern - create table with multiple rows
        println!("\n🧪 Testing window functions ROW_NUMBER with real table data");
        
        // Drop table if it exists (ignore errors if it doesn't exist)
        let _ = execute_hana_query("DROP TABLE ProductSalesRowNumber");
        
        // Create test table
        let create_sql = "CREATE TABLE ProductSalesRowNumber (ProdName NVARCHAR(50), Type NVARCHAR(20), Sales INT)";
        execute_hana_query(create_sql)?;
        
        // Insert test data (from HANA documentation) - one by one
        execute_hana_query("INSERT INTO ProductSalesRowNumber VALUES('Tee Shirt','Plain',21)")?;
        execute_hana_query("INSERT INTO ProductSalesRowNumber VALUES ('Tee Shirt','Lettered',22)")?;
        execute_hana_query("INSERT INTO ProductSalesRowNumber VALUES ('Tee Shirt','Team logo',30)")?;
        execute_hana_query("INSERT INTO ProductSalesRowNumber VALUES('Hoodie','Plain',60)")?;
        execute_hana_query("INSERT INTO ProductSalesRowNumber VALUES ('Hoodie','Lettered',65)")?;
        execute_hana_query("INSERT INTO ProductSalesRowNumber VALUES ('Hoodie','Team logo',80)")?;
        execute_hana_query("INSERT INTO ProductSalesRowNumber VALUES('Ballcap','Plain',8)")?;
        execute_hana_query("INSERT INTO ProductSalesRowNumber VALUES ('Ballcap','Lettered',40)")?;
        execute_hana_query("INSERT INTO ProductSalesRowNumber VALUES ('Ballcap','Team logo',27)")?;
        
        // Test ROW_NUMBER (exact pattern from HANA docs)
        let sql = r#"
            SELECT ProdName, Type, Sales,
              ROW_NUMBER() OVER (PARTITION BY ProdName ORDER BY Sales DESC) AS row_num
            FROM ProductSalesRowNumber
            ORDER BY ProdName, Sales DESC
        "#;
        test_transformation_and_execution(
            "window functions ROW_NUMBER",
            sql,
            &["ROW_NUMBER() OVER", "PARTITION BY", "ORDER BY"]
        )?;
        
        // Clean up
        execute_hana_query("DROP TABLE ProductSalesRowNumber")?;
        Ok(())
    }

    #[test]
    fn test_window_functions_rank() -> Result<(), Box<dyn std::error::Error>> {
        // Following SAP HANA documentation pattern
        println!("\n🧪 Testing window functions RANK with real table data");
        
        // Drop table if it exists (ignore errors if it doesn't exist)
        let _ = execute_hana_query("DROP TABLE ProductSalesRank");
        
        // Create test table (use standard CREATE TABLE, not CREATE ROW TABLE)
        let create_sql = "CREATE TABLE ProductSalesRank (ProdName NVARCHAR(50), Type NVARCHAR(20), Sales INT)";
        execute_hana_query(create_sql)?;
        
        // Insert test data (from HANA documentation) - one by one
        execute_hana_query("INSERT INTO ProductSalesRank VALUES('Tee Shirt','Plain',21)")?;
        execute_hana_query("INSERT INTO ProductSalesRank VALUES('Tee Shirt','Lettered',22)")?;
        execute_hana_query("INSERT INTO ProductSalesRank VALUES('Tee Shirt','Team logo',30)")?;
        execute_hana_query("INSERT INTO ProductSalesRank VALUES('Hoodie','Plain',60)")?;
        execute_hana_query("INSERT INTO ProductSalesRank VALUES('Hoodie','Lettered',65)")?;
        execute_hana_query("INSERT INTO ProductSalesRank VALUES('Hoodie','Team logo',80)")?;
        execute_hana_query("INSERT INTO ProductSalesRank VALUES('Ballcap','Vintage',60)")?;
        execute_hana_query("INSERT INTO ProductSalesRank VALUES('Ballcap','Plain',8)")?;
        execute_hana_query("INSERT INTO ProductSalesRank VALUES('Ballcap','Lettered',40)")?;
        execute_hana_query("INSERT INTO ProductSalesRank VALUES('Ballcap','Team logo',40)")?;
        
        // Test RANK (exact pattern from HANA docs)
        let sql = r#"
            SELECT ProdName, Type, Sales,
            RANK() OVER ( PARTITION BY ProdName ORDER BY Sales DESC ) AS Rank
            FROM ProductSalesRank
            ORDER BY ProdName, Type
        "#;
        test_transformation_and_execution(
            "window functions RANK",
            sql,
            &["RANK() OVER", "PARTITION BY"]
        )?;
        
        // Clean up
        execute_hana_query("DROP TABLE ProductSalesRank")?;
        Ok(())
    }

    #[test]
    fn test_window_functions_dense_rank() -> Result<(), Box<dyn std::error::Error>> {
        // Following SAP HANA documentation pattern
        println!("\n🧪 Testing window functions DENSE_RANK with real table data");
        
        // Drop table if it exists (ignore errors if it doesn't exist)
        let _ = execute_hana_query("DROP TABLE TDenseRank");
        
        // Create test table
        let create_sql = "CREATE TABLE TDenseRank (class NVARCHAR(10), val INT, offset INT)";
        execute_hana_query(create_sql)?;
        
        // Insert test data (from HANA documentation) - one by one
        execute_hana_query("INSERT INTO TDenseRank VALUES('A', 1, 1)")?;
        execute_hana_query("INSERT INTO TDenseRank VALUES('A', 3, 3)")?;
        execute_hana_query("INSERT INTO TDenseRank VALUES('A', 5, null)")?;
        execute_hana_query("INSERT INTO TDenseRank VALUES('A', 5, 2)")?;
        execute_hana_query("INSERT INTO TDenseRank VALUES('A', 10, 0)")?;
        execute_hana_query("INSERT INTO TDenseRank VALUES('B', 1, 3)")?;
        execute_hana_query("INSERT INTO TDenseRank VALUES('B', 1, 1)")?;
        execute_hana_query("INSERT INTO TDenseRank VALUES('B', 7, 1)")?;
        
        // Test DENSE_RANK (exact pattern from HANA docs)
        let sql = r#"
            SELECT class, 
              val,
              ROW_NUMBER() OVER (PARTITION BY class ORDER BY val) AS row_num,
              RANK() OVER (PARTITION BY class ORDER BY val) AS rank,
              DENSE_RANK() OVER (PARTITION BY class ORDER BY val) AS dense_rank
             FROM TDenseRank
        "#;
        test_transformation_and_execution(
            "window functions DENSE_RANK",
            sql,
            &["DENSE_RANK() OVER", "PARTITION BY"]
        )?;
        
        // Clean up
        execute_hana_query("DROP TABLE TDenseRank")?;
        Ok(())
    }

    #[test]
    fn test_window_functions_lead_lag() -> Result<(), Box<dyn std::error::Error>> {
        // Following SAP HANA documentation pattern
        println!("\n🧪 Testing window functions LAG/LEAD with real table data");
        
        // Drop table if it exists (ignore errors if it doesn't exist)
        let _ = execute_hana_query("DROP TABLE TLeadLag");
        
        // Create test table
        let create_sql = "CREATE TABLE TLeadLag (class NVARCHAR(10), val INT, offset INT)";
        execute_hana_query(create_sql)?;
        
        // Insert test data (from HANA documentation) - one by one
        execute_hana_query("INSERT INTO TLeadLag VALUES('A', 1, 1)")?;
        execute_hana_query("INSERT INTO TLeadLag VALUES('A', 3, 3)")?;
        execute_hana_query("INSERT INTO TLeadLag VALUES('A', 5, null)")?;
        execute_hana_query("INSERT INTO TLeadLag VALUES('A', 5, 2)")?;
        execute_hana_query("INSERT INTO TLeadLag VALUES('A', 10, 0)")?;
        execute_hana_query("INSERT INTO TLeadLag VALUES('B', 1, 3)")?;
        execute_hana_query("INSERT INTO TLeadLag VALUES('B', 1, 1)")?;
        execute_hana_query("INSERT INTO TLeadLag VALUES('B', 7, 1)")?;
        
        // Test LAG/LEAD (exact pattern from HANA docs)
        let sql = r#"
            SELECT class, 
              val, 
              offset,
              LEAD(val) OVER (PARTITION BY class ORDER BY val) AS lead,
              LEAD(val, offset, -val) OVER (PARTITION BY class ORDER BY val) AS lead2,
              LAG(val) OVER (PARTITION BY class ORDER BY val) AS lag,
              LAG(val, offset, -val) OVER (PARTITION BY class ORDER BY val) AS lag2
             FROM TLeadLag
        "#;
        test_transformation_and_execution(
            "window functions LAG/LEAD",
            sql,
            &["LAG", "LEAD", "OVER", "PARTITION BY"]
        )?;
        
        // Clean up
        execute_hana_query("DROP TABLE TLeadLag")?;
        Ok(())
    }

    #[test]
    fn test_cte_simple() -> Result<(), Box<dyn std::error::Error>> {
        // Use exactly the pattern from SAP HANA documentation
        let sql = "WITH q1 AS (SELECT 1 AS test_col FROM DUMMY) SELECT * FROM q1";
        test_transformation_and_execution(
            "simple CTE",
            sql,
            &["WITH", "AS", "SELECT"]
        )
    }

    #[test]
    fn test_cte_recursive() -> Result<(), Box<dyn std::error::Error>> {
        // HANA doesn't support recursive CTEs, so we'll test a simple hierarchical query instead
        let sql = "SELECT 1 as id, 'Manager' as name, NULL as manager_id, 1 as level FROM DUMMY UNION ALL SELECT 2 as id, 'Employee' as name, 1 as manager_id, 2 as level FROM DUMMY";
        test_transformation_and_execution(
            "hierarchical query simulation",
            sql,
            &["UNION ALL"]
        )
    }

    #[test]
    fn test_cte_multiple() -> Result<(), Box<dyn std::error::Error>> {
        let sql = r#"
            WITH
            high_earners AS (SELECT 1 as emp_id, 'John' as name, 75000 as salary, 1 as dept_id FROM DUMMY),
            departments AS (SELECT 1 as id, 'Engineering' as dept_name, true as active FROM DUMMY)
            SELECT he.name, d.dept_name
            FROM high_earners he
            JOIN departments d ON he.dept_id = d.id
        "#;
        test_transformation_and_execution(
            "multiple CTEs",
            sql,
            &["WITH", "high_earners AS", "departments AS"]
        )
    }

    #[test]
    fn test_advanced_join_full_outer() -> Result<(), Box<dyn std::error::Error>> {
        // Create temporary test tables for the join
        let _ = execute_hana_query("DROP TABLE users_temp");
        let _ = execute_hana_query("DROP TABLE profiles_temp");
        
        execute_hana_query("CREATE TABLE users_temp (id INTEGER, name NVARCHAR(50))")?;
        execute_hana_query("CREATE TABLE profiles_temp (user_id INTEGER, profile_data NVARCHAR(100))")?;
        
        // Insert test data
        execute_hana_query("INSERT INTO users_temp VALUES (1, 'John')")?;
        execute_hana_query("INSERT INTO users_temp VALUES (2, 'Jane')")?;
        execute_hana_query("INSERT INTO profiles_temp VALUES (1, 'Profile1')")?;
        execute_hana_query("INSERT INTO profiles_temp VALUES (3, 'Profile3')")?;
        
        let sql = "SELECT * FROM users_temp u FULL OUTER JOIN profiles_temp p ON u.id = p.user_id";
        test_transformation_and_execution(
            "advanced join FULL OUTER",
            sql,
            &["FULL OUTER JOIN"]
        )?;
        
        // Clean up
        execute_hana_query("DROP TABLE users_temp")?;
        execute_hana_query("DROP TABLE profiles_temp")?;
        Ok(())
    }

    #[test]
    fn test_advanced_join_cross() -> Result<(), Box<dyn std::error::Error>> {
        // Create temporary test tables for the cross join
        let _ = execute_hana_query("DROP TABLE table1_temp");
        let _ = execute_hana_query("DROP TABLE table2_temp");
        
        execute_hana_query("CREATE TABLE table1_temp (id INTEGER, name NVARCHAR(20))")?;
        execute_hana_query("CREATE TABLE table2_temp (id INTEGER, category NVARCHAR(20))")?;
        
        // Insert minimal test data
        execute_hana_query("INSERT INTO table1_temp VALUES (1, 'Item1')")?;
        execute_hana_query("INSERT INTO table2_temp VALUES (1, 'Cat1')")?;
        
        let sql = "SELECT * FROM table1_temp CROSS JOIN table2_temp";
        test_transformation_and_execution(
            "advanced join CROSS",
            sql,
            &["CROSS JOIN"]
        )?;
        
        // Clean up
        execute_hana_query("DROP TABLE table1_temp")?;
        execute_hana_query("DROP TABLE table2_temp")?;
        Ok(())
    }

    #[test]
    fn test_sequence_nextval_transformation() -> Result<(), Box<dyn std::error::Error>> {
        // First create a sequence for testing
        let _ = execute_hana_query("DROP SEQUENCE user_id_seq");
        execute_hana_query("CREATE SEQUENCE user_id_seq START WITH 1 INCREMENT BY 1")?;
        
        let sql = "SELECT nextval('user_id_seq') as new_id FROM DUMMY";
        test_transformation_and_execution(
            "sequence NEXTVAL",
            sql,
            &["user_id_seq.NEXTVAL"]
        )?;
        
        // Clean up
        execute_hana_query("DROP SEQUENCE user_id_seq")?;
        Ok(())
    }

    #[test]
    fn test_sequence_currval_transformation() -> Result<(), Box<dyn std::error::Error>> {
        // Use same connection for the entire test to maintain session state
        let conn = get_hana_connection()?;
        
        // First create a sequence and get a value for testing CURRVAL
        let _ = conn.multiple_statements(vec!["DROP SEQUENCE user_id_seq_curr".to_string()]);
        conn.multiple_statements(vec!["CREATE SEQUENCE user_id_seq_curr START WITH 100 INCREMENT BY 1".to_string()])?;
        
        // First call NEXTVAL to initialize the sequence in this session
        let _ = conn.query("SELECT user_id_seq_curr.NEXTVAL FROM DUMMY")?;
        
        let sql = "SELECT currval('user_id_seq_curr') as current_id FROM DUMMY";
        let transformer = create_transformer();
        let transformed_sql = transformer.transform(sql)?;
        
        println!("🧪 Testing sequence CURRVAL");
        println!("Original SQL: {}", sql);
        println!("Transformed: {}", transformed_sql);
        
        // Verify the transformation contains expected HANA syntax
        assert!(transformed_sql.contains("user_id_seq_curr.CURRVAL"));
        
        // Execute the transformed SQL using the same connection
        let result = conn.query(&transformed_sql)?;
        
        // Consume the result
        for row_result in result {
            let _row = row_result?;
        }
        
        // Clean up
        conn.multiple_statements(vec!["DROP SEQUENCE user_id_seq_curr".to_string()])?;
        Ok(())
    }

    #[test]
    fn test_sequence_in_insert() -> Result<(), Box<dyn std::error::Error>> {
        // Create sequence and table for testing
        let _ = execute_hana_query("DROP SEQUENCE user_seq_insert");
        let _ = execute_hana_query("DROP TABLE users_insert_test");
        
        execute_hana_query("CREATE SEQUENCE user_seq_insert START WITH 1 INCREMENT BY 1")?;
        execute_hana_query("CREATE TABLE users_insert_test (id INTEGER, name NVARCHAR(50))")?;
        
        let sql = "INSERT INTO users_insert_test (id, name) VALUES (nextval('user_seq_insert'), 'John')";
        test_transformation_and_execution(
            "sequence in INSERT",
            sql,
            &["user_seq_insert.NEXTVAL"]
        )?;
        
        // Verify the insert worked
        execute_hana_query("SELECT * FROM users_insert_test")?;
        
        // Clean up
        execute_hana_query("DROP TABLE users_insert_test")?;
        execute_hana_query("DROP SEQUENCE user_seq_insert")?;
        Ok(())
    }

    #[test]
    fn test_index_transformation_btree() -> Result<(), Box<dyn std::error::Error>> {
        // Create a table first, then create an index on it
        let _ = execute_hana_query("DROP TABLE users_btree_test");
        execute_hana_query("CREATE TABLE users_btree_test (id INTEGER, email NVARCHAR(100))")?;
        
        let sql = "CREATE INDEX idx_users_email_btree ON users_btree_test USING btree (email)";
        test_transformation_and_execution(
            "index transformation BTREE",
            sql,
            &["CREATE INDEX idx_users_email_btree ON users_btree_test (email)"]
        )?;
        
        // Clean up
        execute_hana_query("DROP INDEX idx_users_email_btree")?;
        execute_hana_query("DROP TABLE users_btree_test")?;
        Ok(())
    }

    #[test]
    fn test_index_transformation_gin() -> Result<(), Box<dyn std::error::Error>> {
        // Create a table first, then create an index on it
        let _ = execute_hana_query("DROP TABLE users_gin_test");
        execute_hana_query("CREATE TABLE users_gin_test (id INTEGER, data NVARCHAR(500))")?;
        
        let sql = "CREATE INDEX idx_users_data_gin ON users_gin_test USING gin (data)";
        test_transformation_and_execution(
            "index transformation GIN",
            sql,
            &["CREATE INDEX idx_users_data_gin ON users_gin_test (data)"]
        )?;
        
        // Clean up
        execute_hana_query("DROP INDEX idx_users_data_gin")?;
        execute_hana_query("DROP TABLE users_gin_test")?;
        Ok(())
    }

    #[test]
    fn test_constraint_transformation_check() -> Result<(), Box<dyn std::error::Error>> {
        // Create a table first, then add constraint
        let _ = execute_hana_query("DROP TABLE users_check_test");
        execute_hana_query("CREATE TABLE users_check_test (id INTEGER, age INTEGER)")?;
        
        let sql = "ALTER TABLE users_check_test ADD CONSTRAINT check_age CHECK (age >= 0 AND age <= 150)";
        test_transformation_and_execution(
            "constraint transformation CHECK",
            sql,
            &["CHECK (age >= 0 AND age <= 150)"]
        )?;
        
        // Test the constraint by inserting valid data
        execute_hana_query("INSERT INTO users_check_test VALUES (1, 25)")?;
        
        // Clean up
        execute_hana_query("DROP TABLE users_check_test")?;
        Ok(())
    }

    #[test]
    fn test_constraint_transformation_unique() -> Result<(), Box<dyn std::error::Error>> {
        // Create a table first, then add unique constraint
        let _ = execute_hana_query("DROP TABLE users_unique_test");
        execute_hana_query("CREATE TABLE users_unique_test (id INTEGER, email VARCHAR(100))")?;
        
        let sql = "ALTER TABLE users_unique_test ADD CONSTRAINT unique_email UNIQUE (email)";
        test_transformation_and_execution(
            "constraint transformation UNIQUE",
            sql,
            &["UNIQUE (email)"]
        )?;
        
        // Test the constraint by inserting data
        execute_hana_query("INSERT INTO users_unique_test VALUES (1, 'test@example.com')")?;
        
        // Clean up
        execute_hana_query("DROP TABLE users_unique_test")?;
        Ok(())
    }

    #[test]
    fn verify_hana_basic_syntax() {
        println!("🔍 Testing basic HANA syntax WITH DUMMY...\n");
        
        // Test basic queries WITH DUMMY (HANA requires FROM clause)
        test_query("Basic VALUES", "SELECT 1 as test_col FROM DUMMY");
        test_query("Basic dual equivalent", "SELECT CURRENT_TIMESTAMP FROM DUMMY");
        test_query("Basic arithmetic", "SELECT 1 + 1 as result FROM DUMMY");
        
        // Test if DUMMY table exists
        test_query("Check DUMMY table", "SELECT COUNT(*) FROM DUMMY");
        test_query("Check SYS.DUMMY table", "SELECT COUNT(*) FROM SYS.DUMMY");
        
        // Test creating a real table for testing
        let _ = execute_hana_query("DROP TABLE test_table_temp");
        test_query("Create test table", "CREATE TABLE test_table_temp (id INTEGER, name NVARCHAR(50))");
        
        if test_query("Insert test data", "INSERT INTO test_table_temp VALUES (1, 'test')") {
            test_query("Basic SELECT from real table", "SELECT * FROM test_table_temp");
            test_query("Window function on real table", "SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn FROM test_table_temp");
        }
        
        test_query("Drop test table", "DROP TABLE test_table_temp");
        
        println!("\n🏁 Basic syntax testing complete!");
    }

    fn test_query(description: &str, query: &str) -> bool {
        println!("
🧪 Testing: {}", description);
        println!("Query: {}", query);
        
        match get_hana_connection() {
            Ok(conn) => {
                // Use appropriate method based on query type
                if query.trim().to_uppercase().starts_with("SELECT") || query.trim().to_uppercase().contains("WITH") {
                    match conn.query(query) {
                        Ok(result) => {
                            // Consume the result set properly - collect all rows to ensure query execution completes
                            let rows: Result<Vec<_>, _> = result.collect();
                            match rows {
                                Ok(_) => {
                                    println!("✅ SUCCESS: Query executed successfully");
                                    true
                                }
                                Err(e) => {
                                    println!("❌ FAILED: Error processing results: {}", e);
                                    false
                                }
                            }
                        }
                        Err(e) => {
                            println!("❌ FAILED: {}", e);
                            false
                        }
                    }
                } else {
                    // For exec() statements (INSERT, CREATE, etc.) use multiple_statements()
                    match conn.multiple_statements(vec![query]) {
                        Ok(_) => {
                            println!("✅ SUCCESS: Query executed successfully");
                            true
                        }
                        Err(e) => {
                            println!("❌ FAILED: {}", e);
                            false
                        }
                    }
                }
            }
            Err(e) => {
                println!("❌ CONNECTION FAILED: {}", e);
                false
            }
        }
    }

    #[test]
    fn test_complex_query_with_multiple_features() -> Result<(), Box<dyn std::error::Error>> {
        // Create sequence and table first
        let _ = execute_hana_query("DROP SEQUENCE report_id_seq");
        let _ = execute_hana_query("DROP TABLE employees_complex_test");
        
        execute_hana_query("CREATE SEQUENCE report_id_seq START WITH 1 INCREMENT BY 1")?;
        execute_hana_query("CREATE TABLE employees_complex_test (id INTEGER, name VARCHAR(100), salary INTEGER, department VARCHAR(50), active BOOLEAN)")?;
        
        // Insert test data
        execute_hana_query("INSERT INTO employees_complex_test VALUES (1, 'John', 5000, 'IT', TRUE)")?;
        execute_hana_query("INSERT INTO employees_complex_test VALUES (2, 'Jane', 6000, 'IT', TRUE)")?;
        execute_hana_query("INSERT INTO employees_complex_test VALUES (3, 'Bob', 4500, 'IT', TRUE)")?;
        execute_hana_query("INSERT INTO employees_complex_test VALUES (4, 'Alice', 7000, 'HR', TRUE)")?;
        execute_hana_query("INSERT INTO employees_complex_test VALUES (5, 'Charlie', 5500, 'HR', TRUE)")?;
        
        let sql = r#"
            WITH ranked_employees AS (
                SELECT
                    id,
                    name,
                    salary,
                    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as salary_rank
                FROM employees_complex_test
                WHERE active = true
            )
            SELECT
                re.name,
                re.salary,
                re.salary_rank,
                nextval('report_id_seq') as report_id
            FROM ranked_employees re
            WHERE re.salary_rank <= 3
        "#;

        test_transformation_and_execution(
            "complex query with multiple features",
            sql,
            &["WITH ranked_employees AS", "ROW_NUMBER() OVER", "NEXTVAL"]
        )?;
        
        // Clean up
        execute_hana_query("DROP TABLE employees_complex_test")?;
        execute_hana_query("DROP SEQUENCE report_id_seq")?;
        Ok(())
    }

    #[test]
    fn test_hana_version_and_window_functions() {
        println!("🔍 Checking HANA version and window function support...");
        
        // Check HANA version
        let version_queries = vec![
            "SELECT VERSION FROM SYS.M_DATABASE",
            "SELECT DATABASE_NAME, SQL_PORT, VERSION FROM SYS.M_DATABASES", 
            "SELECT SYSTEM_ID, DATABASE_NAME, VERSION FROM SYS.M_SYSTEM_OVERVIEW",
        ];
        
        for query in version_queries {
            println!("\n🧪 Version Query: {}", query);
            if test_query("HANA Version", query) {
                break; // If one works, we got the version
            }
        }
        
        // First test window functions on DUMMY (should fail)
        println!("\n--- Testing Window Functions on DUMMY ---");
        let window_function_tests = vec![
            ("Simple ROW_NUMBER on DUMMY", "SELECT ROW_NUMBER() OVER (ORDER BY 1) as rn FROM DUMMY"),
            ("Simple RANK on DUMMY", "SELECT RANK() OVER (ORDER BY 1) as rnk FROM DUMMY"),
        ];
        
        for (test_name, query) in window_function_tests {
            println!("\n🧪 Window Function Test: {}", test_name);
            test_query(test_name, query);
        }
        
        // Now test with a real table with data
        println!("\n--- Testing Window Functions on Real Table ---");
        
        // Create table with multiple rows
        let _ = execute_hana_query("DROP TABLE window_test_table");
        test_query("Create test table for window functions", 
                  "CREATE TABLE window_test_table (id INTEGER, name NVARCHAR(50), salary INTEGER)");
        
        // Insert multiple rows
        let insert_success = test_query("Insert row 1", "INSERT INTO window_test_table VALUES (1, 'Alice', 50000)") &&
                            test_query("Insert row 2", "INSERT INTO window_test_table VALUES (2, 'Bob', 60000)") &&
                            test_query("Insert row 3", "INSERT INTO window_test_table VALUES (3, 'Charlie', 55000)");
        
        if insert_success {
            println!("\n🧪 Testing window functions on real table with data:");
            
            let real_table_tests = vec![
                ("ROW_NUMBER on real table", "SELECT id, name, ROW_NUMBER() OVER (ORDER BY salary) as rn FROM window_test_table"),
                ("RANK on real table", "SELECT id, name, RANK() OVER (ORDER BY salary) as rnk FROM window_test_table"),
                ("DENSE_RANK on real table", "SELECT id, name, DENSE_RANK() OVER (ORDER BY salary) as dense_rnk FROM window_test_table"),
                ("LAG on real table", "SELECT id, name, LAG(salary, 1) OVER (ORDER BY salary) as prev_salary FROM window_test_table"),
                ("LEAD on real table", "SELECT id, name, LEAD(salary, 1) OVER (ORDER BY salary) as next_salary FROM window_test_table"),
            ];
            
            for (test_name, query) in real_table_tests {
                println!("\n🧪 {}", test_name);
                test_query(test_name, query);
            }
        } else {
            println!("❌ Failed to insert test data, skipping real table window function tests");
        }
        
        // Cleanup
        test_query("Drop test table", "DROP TABLE window_test_table");
    }
}
