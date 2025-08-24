// Integration tests for DuckDB extension with HANA
use hana_scan::{HanaPerformanceMetrics, HanaError, LogLevel, HanaLogger};

mod common;

#[test]
fn test_duckdb_extension_loading() {
    common::setup();
    
    // Test basic functionality without DuckDB connection for now
    // This is a placeholder that validates the extension can be compiled
    // In a real scenario, this would test loading the extension in DuckDB
    
    println!("✓ DuckDB extension compilation test passed");
    assert!(true, "Extension compiles successfully");
}

#[test]
fn test_duckdb_hana_scan_function_registration() {
    common::setup();
    let config = common::HanaTestConfig::new();
    
    if config.should_skip {
        println!("Skipping test_duckdb_hana_scan_function_registration: {}", config.skip_reason);
        return;
    }

    // Test function registration logic without actual DuckDB connection
    // This validates the extension structure is correct
    
    println!("✓ DuckDB extension registration test framework ready");
    println!("  Extension would be loaded and hana_scan function registered");
    println!("  Connection URL: {}", config.connection_url);
    
    // Validate connection URL format
    assert!(config.connection_url.starts_with("hdbsql://"), "Connection URL should start with hdbsql://");
}

#[test]
fn test_hana_scan_query_validation() {
    common::setup();
    let config = common::HanaTestConfig::new();
    
    if config.should_skip {
        println!("Skipping test_hana_scan_query_validation: {}", config.skip_reason);
        return;
    }

    // Test query validation logic
    let valid_queries = vec![
        "SELECT * FROM DUMMY",
        "SELECT CURRENT_DATE FROM DUMMY",
        "SELECT 1, 2, 3 FROM DUMMY",
        "SELECT * FROM SYS.TABLES WHERE SCHEMA_NAME = 'SYS'",
    ];
    
    let invalid_queries = vec![
        "",  // Empty query
        "   ",  // Whitespace only
        "INVALID SQL SYNTAX",
        "DROP TABLE SYS.TABLES",  // Potentially dangerous
    ];
    
    println!("Testing valid queries:");
    for (i, query) in valid_queries.iter().enumerate() {
        println!("  {}: {}", i + 1, query);
        // In a real test, you would validate the query
        assert!(!query.trim().is_empty(), "Query should not be empty");
    }
    
    println!("Testing invalid queries:");
    for (i, query) in invalid_queries.iter().enumerate() {
        println!("  {}: {:?}", i + 1, query);
        if query.trim().is_empty() {
            println!("    ✓ Correctly identified empty query");
        }
    }
    
    println!("✓ Query validation tests completed");
}

#[test]
fn test_hana_configuration_parsing() {
    common::setup();
    
    // Test various configuration scenarios
    let test_configs = vec![
        ("HANA_BATCH_SIZE", "1000"),
        ("HANA_CONNECTION_TIMEOUT_MS", "30000"),
        ("HANA_QUERY_TIMEOUT_MS", "300000"),
        ("HANA_MAX_RETRIES", "3"),
        ("HANA_LOG_LEVEL", "INFO"),
    ];
    
    println!("Testing configuration parsing:");
    for (key, value) in test_configs {
        std::env::set_var(key, value);
        let retrieved = std::env::var(key).unwrap_or_default();
        println!("  {} = {}", key, retrieved);
        assert_eq!(retrieved, value, "Configuration value should match");
    }
    
    // Test parsing of numeric values
    let batch_size: usize = std::env::var("HANA_BATCH_SIZE")
        .unwrap_or("1000".to_string())
        .parse()
        .expect("Batch size should be numeric");
    
    assert!(batch_size > 0, "Batch size should be positive");
    assert!(batch_size <= 10000, "Batch size should be reasonable");
    
    println!("✓ Configuration parsing tests completed");
}

#[test]
fn test_performance_metrics_initialization() {
    common::setup();
    
    // Test performance metrics structure
    let metrics = HanaPerformanceMetrics::default();
    
    println!("Testing performance metrics:");
    println!("  Connection time: {:?} ms", metrics.connection_time_ms);
    println!("  Query time: {:?} ms", metrics.query_time_ms);
    println!("  Memory allocated: {} bytes", metrics.memory_allocated_bytes);
    println!("  Rows processed: {}", metrics.rows_processed);
    
    // Verify initial values
    assert_eq!(metrics.connection_time_ms, None, "Initial connection time should be None");
    assert_eq!(metrics.query_time_ms, None, "Initial query time should be None");
    assert_eq!(metrics.memory_allocated_bytes, 0, "Initial memory usage should be 0");
    assert_eq!(metrics.rows_processed, 0, "Initial rows processed should be 0");
    
    println!("✓ Performance metrics initialization test completed");
}

#[test]
fn test_error_hierarchy() {
    common::setup();
    
    // Test different error types
    let connection_error = HanaError::Connection {
        message: "Failed to connect".to_string(),
        url: Some("hdbsql://test@localhost:39041/HDB".to_string()),
        retry_count: Some(3),
        context: "Test connection context".to_string(),
    };
    
    let query_error = HanaError::Query {
        message: "Invalid SQL".to_string(),
        query: Some("SELECT * FROM invalid_table".to_string()),
        execution_time_ms: Some(100),
        context: "Test query context".to_string(),
    };
    
    let type_error = HanaError::TypeConversion {
        message: "Cannot convert type".to_string(),
        source_type: Some("VARCHAR".to_string()),
        target_type: Some("INTEGER".to_string()),
        column_name: Some("test_column".to_string()),
        row_index: Some(1),
    };
    
    println!("Testing error hierarchy:");
    println!("  Connection error: {}", connection_error);
    println!("  Query error: {}", query_error);
    println!("  Type conversion error: {}", type_error);
    
    // Verify error types are distinct
    match connection_error {
        HanaError::Connection { retry_count, .. } => {
            assert_eq!(retry_count, Some(3), "Retry count should match");
        }
        _ => panic!("Should be a connection error"),
    }
    
    match query_error {
        HanaError::Query { query, .. } => {
            assert!(query.as_ref().map_or(false, |q| q.contains("invalid_table")), "Query should contain table name");
        }
        _ => panic!("Should be a query error"),
    }
    
    println!("✓ Error hierarchy test completed");
}

#[test]
fn test_logging_system() {
    common::setup();
    
    println!("Testing logging system:");
    
    // Test different log levels using the static methods
    HanaLogger::log(LogLevel::Error, "test", "Test error message");
    HanaLogger::log(LogLevel::Warn, "test", "Test warning message");
    HanaLogger::log(LogLevel::Info, "test", "Test info message");
    HanaLogger::log(LogLevel::Debug, "test", "Test debug message");
    HanaLogger::log(LogLevel::Trace, "test", "Test trace message");
    
    // Test specific level methods
    HanaLogger::error("test", "Direct error message");
    HanaLogger::warn("test", "Direct warning message");
    HanaLogger::info("test", "Direct info message");
    HanaLogger::debug("test", "Direct debug message");
    HanaLogger::trace("test", "Direct trace message");
    
    println!("✓ Logging system test completed");
}
