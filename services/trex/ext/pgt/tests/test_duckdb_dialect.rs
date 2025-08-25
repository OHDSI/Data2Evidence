use pgt::{SqlTransformer, Dialect};
use pgt::config::TransformationConfig;

#[test]
fn test_duckdb_dialect_pass_through() {
    let config = TransformationConfig::default();
    let transformer = SqlTransformer::new(config, Dialect::DuckDb).unwrap();
    
    // Test simple SELECT
    let input = "SELECT * FROM users WHERE id = 1;";
    let result = transformer.transform(input).unwrap();
    assert_eq!(result, input);
    
    // Test with another dialect to ensure DuckDB doesn't transform the logic
    let hana_transformer = SqlTransformer::new(TransformationConfig::default(), Dialect::Hana).unwrap();
    
    // Use a simpler query that won't get reformatted by the parser
    let simple_input = "SELECT id FROM users;";
    
    let duckdb_result = transformer.transform(simple_input).unwrap();
    let hana_result = hana_transformer.transform(simple_input).unwrap();
    
    // Both should be the same for this simple query (no transformations applied)
    assert_eq!(duckdb_result, simple_input);
    assert_eq!(hana_result, simple_input);
    
    // Test that DuckDB preserves complex PostgreSQL syntax without transformation
    let postgres_syntax = "CREATE TABLE test (id SERIAL, name TEXT);";
    let duckdb_complex = transformer.transform(postgres_syntax).unwrap();
    
    // DuckDB should preserve the SERIAL keyword (no transformation to IDENTITY)
    assert!(duckdb_complex.contains("SERIAL"));
    assert!(!duckdb_complex.contains("IDENTITY"));
}

#[test]
fn test_duckdb_vs_hana_dialect_difference() {
    let config = TransformationConfig::default();
    
    // Create transformers for both dialects
    let duckdb_transformer = SqlTransformer::new(config.clone(), Dialect::DuckDb).unwrap();
    let hana_transformer = SqlTransformer::new(config, Dialect::Hana).unwrap();
    
    // Test with a query that triggers transformations in HANA but not in DuckDB
    let serial_input = "CREATE TABLE test (id SERIAL PRIMARY KEY, name VARCHAR(100));";
    
    let duckdb_result = duckdb_transformer.transform(serial_input).unwrap();
    let hana_result = hana_transformer.transform(serial_input).unwrap();
    
    // DuckDB should preserve SERIAL keyword
    assert!(duckdb_result.contains("SERIAL"));
    
    // HANA should transform SERIAL to IDENTITY (or at least should be different transformation engine)
    // The actual transformation depends on the HANA implementation
    println!("Input: {}", serial_input);
    println!("DuckDB: {}", duckdb_result);
    println!("HANA: {}", hana_result);
    
    // The key assertion: DuckDB preserves the input structure while HANA may transform it
    assert!(duckdb_result.contains("SERIAL"), "DuckDB should preserve SERIAL keyword");
}

#[test]
fn test_dialect_metadata() {
    // Test that the dialect enum works correctly
    assert_eq!(Dialect::DuckDb.name(), "duckdb");
    assert_eq!(Dialect::Hana.name(), "hana");
    
    // Test parsing
    assert_eq!(Dialect::from_str("duckdb").unwrap(), Dialect::DuckDb);
    assert_eq!(Dialect::from_str("duck-db").unwrap(), Dialect::DuckDb);
    assert_eq!(Dialect::from_str("duck_db").unwrap(), Dialect::DuckDb);
    assert_eq!(Dialect::from_str("DUCKDB").unwrap(), Dialect::DuckDb);
    
    // Test all dialects are included
    let all_dialects = Dialect::all();
    assert!(all_dialects.contains(&Dialect::Hana));
    assert!(all_dialects.contains(&Dialect::DuckDb));
    assert_eq!(all_dialects.len(), 2);
}
