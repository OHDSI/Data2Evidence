pub mod hana;
pub mod duckdb;

use crate::config::TransformationConfig;
use crate::error::{TransformationError, TransformationResult};
use sqlparser::ast::Statement;
use std::fmt;

/// Supported SQL dialects for transformation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Dialect {
    /// SAP HANA SQL dialect
    Hana,
    /// DuckDB SQL dialect
    DuckDb,
    // Future dialects can be added here:
    // ClickHouse,
    // Snowflake,
}

impl Dialect {
    /// Get all supported dialects
    pub fn all() -> &'static [Dialect] {
        &[Dialect::Hana, Dialect::DuckDb]
    }

    /// Get the name of the dialect
    pub fn name(&self) -> &'static str {
        match self {
            Dialect::Hana => "hana",
            Dialect::DuckDb => "duckdb",
        }
    }

    /// Parse dialect from string (case-insensitive)
    pub fn from_str(s: &str) -> Result<Dialect, String> {
        match s.to_lowercase().as_str() {
            "hana" | "sap-hana" | "sap_hana" => Ok(Dialect::Hana),
            "duckdb" | "duck-db" | "duck_db" => Ok(Dialect::DuckDb),
            _ => Err(format!("Unsupported dialect: {}. Supported dialects: {}", 
                s, 
                Dialect::all().iter()
                    .map(|d| d.name())
                    .collect::<Vec<_>>()
                    .join(", ")
            )),
        }
    }
}

impl Default for Dialect {
    fn default() -> Self {
        Dialect::Hana
    }
}

impl fmt::Display for Dialect {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.name())
    }
}

/// Trait for dialect-specific transformation engines
pub trait DialectTransformationEngine {
    /// Get the dialect this engine supports
    fn dialect(&self) -> Dialect;

    /// Transform a single statement
    fn transform_statement(&self, stmt: Statement) -> TransformationResult<Statement>;

    /// Transform multiple statements
    fn transform_statements(&self, statements: &[Statement]) -> TransformationResult<Vec<Statement>>;

    /// Apply post-processing rules specific to the dialect
    fn apply_post_processing_rules(&self, sql: &str) -> TransformationResult<String>;

    /// Validate statement for dialect compatibility
    fn validate_statement_for_hana(&self, stmt: &Statement) -> TransformationResult<Vec<String>>;

    /// Get the name of this engine
    fn name(&self) -> &'static str;
}

/// Factory for creating dialect-specific transformation engines
pub struct DialectEngineFactory;

impl DialectEngineFactory {
    /// Create a transformation engine for the specified dialect
    pub fn create_engine(dialect: Dialect, config: &TransformationConfig) -> Result<Box<dyn DialectTransformationEngine>, TransformationError> {
        match dialect {
            Dialect::Hana => Ok(Box::new(hana::HanaTransformationEngine::new(config))),
            Dialect::DuckDb => Ok(Box::new(duckdb::DuckDbTransformationEngine::new(config))),
        }
    }

    /// Get all supported dialects
    pub fn supported_dialects() -> &'static [Dialect] {
        Dialect::all()
    }
}
