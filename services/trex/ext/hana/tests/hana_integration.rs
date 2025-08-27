// Integration tests for HANA extension with real HANA database connection
// Import from the current crate
use hana_scan::{
    validate_hana_connection, parse_hana_url, HanaConnection
};

mod common;

#[test]
fn test_hana_connection_basic() {
    common::setup();
    let config = common::HanaTestConfig::new();
    
    if config.should_skip {
        println!("Skipping test_hana_connection_basic: {}", config.skip_reason);
        return;
    }

    // Test basic connection validation
    let result = validate_hana_connection(&config.connection_url);
    
    match result {
        Ok(_) => {
            println!("✓ HANA connection validation passed");
        }
        Err(e) => {
            println!("✗ HANA connection validation failed: {}", e);
            // Don't fail the test if HANA server is not available
            if !common::is_hana_available(&config.connection_url) {
                println!("Skipping test due to HANA server unavailability");
                return;
            }
            panic!("Connection validation failed: {}", e);
        }
    }
}

#[test]
fn test_hana_url_parsing() {
    common::setup();
    let config = common::HanaTestConfig::new();
    
    if config.should_skip {
        println!("Skipping test_hana_url_parsing: {}", config.skip_reason);
        return;
    }

    // Test URL parsing with the test connection string
    let result = parse_hana_url(&config.connection_url);
    
    match result {
        Ok((user, _password, host, port, database)) => {
            println!("✓ HANA URL parsing successful:");
            println!("  User: {}", user);
            println!("  Host: {}", host);
            println!("  Port: {}", port);
            println!("  Database: {}", database);
            
            // Validate parsed components
            assert!(!user.is_empty(), "User should not be empty");
            assert!(!host.is_empty(), "Host should not be empty");
            assert!(port > 0, "Port should be positive");
            assert!(!database.is_empty(), "Database should not be empty");
        }
        Err(e) => {
            panic!("URL parsing failed: {}", e);
        }
    }
}

#[test]
fn test_hana_simple_query() {
    common::setup();
    let config = common::HanaTestConfig::new();
    
    if config.should_skip {
        println!("Skipping test_hana_simple_query: {}", config.skip_reason);
        return;
    }

    // Test simple query execution
    let query = "SELECT 'Hello HANA' AS greeting FROM DUMMY";
    
    let connection_result = HanaConnection::new(config.connection_url.clone());
    
    match connection_result {
        Ok(connection) => {
            println!("✓ HANA connection established");
            
            let query_result = connection.query(query);
            
            match query_result {
                Ok(result_set) => {
                    println!("✓ Query executed successfully");
                    
                    // Count the results
                    let mut count = 0;
                    for row_result in result_set {
                        match row_result {
                            Ok(_row) => {
                                count += 1;
                                println!("  Found row #{}", count);
                            }
                            Err(e) => {
                                println!("✗ Error reading row: {}", e);
                            }
                        }
                    }
                    
                    println!("  Total rows: {}", count);
                    assert!(count > 0, "Should get at least one result from DUMMY table");
                }
                Err(e) => {
                    println!("✗ Query execution failed: {}", e);
                    panic!("Query failed: {}", e);
                }
            }
        }
        Err(e) => {
            println!("✗ HANA connection failed: {}", e);
            if !common::is_hana_available(&config.connection_url) {
                println!("Skipping test due to HANA server unavailability");
                return;
            }
            panic!("Connection failed: {}", e);
        }
    }
}

#[test]
fn test_hana_system_tables_query() {
    common::setup();
    let config = common::HanaTestConfig::new();
    
    if config.should_skip {
        println!("Skipping test_hana_system_tables_query: {}", config.skip_reason);
        return;
    }

    // Test querying system tables
    let query = "SELECT SCHEMA_NAME, TABLE_NAME FROM SYS.TABLES WHERE SCHEMA_NAME = 'SYS' AND TABLE_NAME = 'DUMMY'";
    
    let connection_result = HanaConnection::new(config.connection_url.clone());
    
    match connection_result {
        Ok(connection) => {
            println!("✓ HANA connection established for system tables test");
            
            let query_result = connection.query(query);
            
            match query_result {
                Ok(result_set) => {
                    println!("✓ System tables query executed successfully");
                    
                    // Count results
                    let mut count = 0;
                    for row_result in result_set {
                        match row_result {
                            Ok(_row) => {
                                count += 1;
                                println!("  Found system table row #{}", count);
                            }
                            Err(e) => {
                                println!("✗ Error reading system table row: {}", e);
                            }
                        }
                    }
                    
                    println!("  Total system table rows: {}", count);
                    assert!(count > 0, "Should find SYS.DUMMY table");
                }
                Err(e) => {
                    println!("✗ System tables query failed: {}", e);
                    panic!("System query failed: {}", e);
                }
            }
        }
        Err(e) => {
            println!("✗ HANA connection failed: {}", e);
            if !common::is_hana_available(&config.connection_url) {
                println!("Skipping test due to HANA server unavailability");
                return;
            }
            panic!("Connection failed: {}", e);
        }
    }
}

#[test]
fn test_hana_error_handling() {
    common::setup();
    let config = common::HanaTestConfig::new();
    
    if config.should_skip {
        println!("Skipping test_hana_error_handling: {}", config.skip_reason);
        return;
    }

    // Test error handling with invalid query
    let invalid_query = "SELECT * FROM non_existent_table_12345";
    
    let connection_result = HanaConnection::new(config.connection_url.clone());
    
    match connection_result {
        Ok(connection) => {
            println!("✓ HANA connection established for error handling test");
            
            let query_result = connection.query(invalid_query);
            
            match query_result {
                Ok(_result_set) => {
                    panic!("Expected query to fail, but it succeeded");
                }
                Err(e) => {
                    println!("✓ Error handling working correctly: {}", e);
                    // This is the expected outcome - the query should fail
                    assert!(!e.to_string().is_empty(), "Error message should not be empty");
                }
            }
        }
        Err(e) => {
            println!("✗ HANA connection failed: {}", e);
            if !common::is_hana_available(&config.connection_url) {
                println!("Skipping test due to HANA server unavailability");
                return;
            }
            panic!("Connection failed: {}", e);
        }
    }
}
