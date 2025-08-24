//! # Multi-Dialect SQL Transformer
//!
//! This library provides functionality to transform PostgreSQL SQL statements
//! into various target SQL dialects using the sqlparser-rs library.
//!
//! ## Supported Dialects
//!
//! Currently supported target dialects:
//! - **SAP HANA** - Full PostgreSQL to HANA transformation support
//!
//! Future planned dialects:
//! - DuckDB
//! - ClickHouse
//! - Snowflake
//!
//! ## Quick Start
//!
//! ```rust
//! use pgt::{SqlTransformer, Dialect};
//!
//! // Simple usage with HANA dialect (default)
//! let transformer = SqlTransformer::new(
//!     pgt::TransformationConfig::default(),
//!     Dialect::Hana
//! ).unwrap();
//! let hana_sql = transformer.transform("SELECT * FROM users LIMIT 10 OFFSET 5").unwrap();
//!
//! // Builder pattern for custom configuration
//! let transformer = SqlTransformer::builder()
//!     .with_dialect(Dialect::Hana)
//!     .with_data_types(true)
//!     .with_functions(true)
//!     .build()
//!     .unwrap();
//!
//! let result = transformer.transform("SELECT NOW(), RANDOM()").unwrap();
//!
//! // Backward compatibility - uses HANA dialect by default
//! let transformer = SqlTransformer::with_config(pgt::TransformationConfig::default()).unwrap();
//! ```

pub mod config;
pub mod dialects;
pub mod error;
pub mod generator;
pub mod parser;
pub mod rules;
pub mod utils;

pub use config::{DataTypeConfig, FunctionConfig, RulesConfig, TransformationConfig};
pub use dialects::Dialect;
pub use error::{
    DetailedResult, EnhancedTransformationMetadata, PerformanceMetrics, TransformationError,
    TransformationResult, TransformationWarning,
};
pub use dialects::hana::TransformationMetadata;

// Re-export the main types for easy library usage
// Re-exports for convenience - removed to avoid duplication with struct definitions below

use log::{debug, info};
use sqlparser::dialect::PostgreSqlDialect;
use sqlparser::parser::Parser;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Parser instance with cached dialect for reuse and performance optimization
struct CachedParser {
    dialect: PostgreSqlDialect,
    // Cache for parsed statements to avoid re-parsing identical queries
    parse_cache: Arc<Mutex<HashMap<String, Vec<sqlparser::ast::Statement>>>>,
}

impl CachedParser {
    fn new() -> Self {
        Self {
            dialect: PostgreSqlDialect {},
            parse_cache: Arc::new(Mutex::new(HashMap::with_capacity(100))),
        }
    }

    fn parse(
        &self,
        sql: &str,
    ) -> Result<Vec<sqlparser::ast::Statement>, sqlparser::parser::ParserError> {
        // Check cache first for performance
        if let Ok(cache) = self.parse_cache.lock() {
            if let Some(cached_statements) = cache.get(sql) {
                return Ok(cached_statements.clone());
            }
        }

        // Parse if not in cache
        let statements = Parser::parse_sql(&self.dialect, sql)?;

        // Cache the result (with size limit to prevent memory bloat)
        if let Ok(mut cache) = self.parse_cache.lock() {
            if cache.len() < 1000 {
                // Limit cache size
                cache.insert(sql.to_string(), statements.clone());
            }
        }

        Ok(statements)
    }

    /// Clear the parse cache to free memory
    fn clear_cache(&self) {
        if let Ok(mut cache) = self.parse_cache.lock() {
            cache.clear();
        }
    }
}

/// Main entry point for SQL transformation
pub struct SqlTransformer {
    config: TransformationConfig,
    dialect: Dialect,
    transformer: Box<dyn dialects::DialectTransformationEngine>,
    parser: CachedParser,
}

impl SqlTransformer {
    /// Create a new transformer with the given configuration and dialect
    pub fn new(config: TransformationConfig, dialect: Dialect) -> Result<Self, TransformationError> {
        let transformer = dialects::DialectEngineFactory::create_engine(dialect, &config)?;
        Ok(Self {
            config,
            dialect,
            transformer,
            parser: CachedParser::new(),
        })
    }

    /// Create a new transformer with default dialect (HANA) for backward compatibility
    pub fn with_config(config: TransformationConfig) -> Result<Self, TransformationError> {
        Self::new(config, Dialect::default())
    }

    /// Create a new transformer with HANA dialect (backward compatibility)
    /// This maintains the old API for existing code
    pub fn new_hana(config: TransformationConfig) -> Result<Self, TransformationError> {
        Self::new(config, Dialect::Hana)
    }

    /// Get the current dialect
    pub fn dialect(&self) -> Dialect {
        self.dialect
    }

    /// Quick transformation for single queries (most common use case)
    /// This is the recommended method for library usage - simple and efficient
    pub fn transform(&self, sql: &str) -> TransformationResult<String> {
        // Use optimized path for single query transformations
        let statements = self
            .parser
            .parse(sql)
            .map_err(|e| TransformationError::ParseError {
                message: e.to_string(),
                line: 1,
                column: 0,
            })?;

        let transformed_statements = self.transformer.transform_statements(&statements)?;
        let mut generated_sql = self.generate_sql(&transformed_statements)?;
        
        // Apply post-processing rules for dialect-specific transformations
        generated_sql = self.transformer.apply_post_processing_rules(&generated_sql)?;
        
        Ok(generated_sql)
    }

    /// Check if SQL can be transformed without actually transforming it
    /// Useful for validation in applications
    pub fn can_transform(&self, sql: &str) -> bool {
        self.parser.parse(sql).is_ok()
    }

    /// Transform multiple queries in a batch (convenience method)
    pub fn transform_batch(&self, sqls: Vec<&str>) -> Vec<TransformationResult<String>> {
        sqls.into_iter().map(|sql| self.transform(sql)).collect()
    }

    /// Transform SQL with detailed error reporting and validation context
    pub fn transform_detailed(&self, sql: &str) -> DetailedResult<String> {
        debug!("Starting detailed transformation with validation");

        // Validate configuration
        if let Err(e) = self.config.validate() {
            return DetailedResult {
                result: Err(e),
                warnings: vec!["Configuration validation failed".to_string()],
                metadata: Some(EnhancedTransformationMetadata {
                    transformations_applied: vec![],
                    warnings: vec!["Invalid configuration detected".to_string()],
                    performance_metrics: Default::default(),
                }),
            };
        }

        let mut warnings = Vec::new();
        let mut transformations_applied = Vec::new();
        let start_time = std::time::Instant::now();

        // Parse PostgreSQL SQL with detailed error context
        let statements = match self.parser.parse(sql) {
            Ok(stmts) => stmts,
            Err(e) => {
                let error_str = e.to_string();
                let (line, column) = Self::extract_position_from_error(&error_str);

                return DetailedResult {
                    result: Err(TransformationError::ParseError {
                        message: error_str,
                        line,
                        column,
                    }),
                    warnings: warnings.clone(),
                    metadata: Some(EnhancedTransformationMetadata {
                        transformations_applied,
                        warnings: vec!["Parse error encountered".to_string()],
                        performance_metrics: PerformanceMetrics {
                            parse_time_ms: start_time.elapsed().as_millis() as u64,
                            transform_time_ms: 0,
                            total_time_ms: start_time.elapsed().as_millis() as u64,
                        },
                    }),
                };
            }
        };

        let parse_time = start_time.elapsed().as_millis() as u64;

        // Transform statements with enhanced error recovery
        let transform_start = std::time::Instant::now();
        let transformed_statements = match self.transformer.transform_statements(&statements) {
            Ok(stmts) => {
                transformations_applied.push("Statement transformation completed".to_string());
                stmts
            }
            Err(e) => {
                // Check for partial transformation capability
                if let TransformationError::UnsupportedFeature {
                    context,
                    suggestion,
                    ..
                } = &e
                {
                    warnings.push(format!("Unsupported feature in context: {}", context));
                    if let Some(suggestion) = suggestion {
                        warnings.push(format!("Suggestion: {}", suggestion));
                    }
                }

                return DetailedResult {
                    result: Err(e),
                    warnings: warnings.clone(),
                    metadata: Some(EnhancedTransformationMetadata {
                        transformations_applied,
                        warnings: warnings.clone(),
                        performance_metrics: PerformanceMetrics {
                            parse_time_ms: parse_time,
                            transform_time_ms: transform_start.elapsed().as_millis() as u64,
                            total_time_ms: start_time.elapsed().as_millis() as u64,
                        },
                    }),
                };
            }
        };

        // Generate HANA SQL with post-processing
        let mut hana_sql = match self.generate_sql(&transformed_statements) {
            Ok(sql) => {
                transformations_applied.push("SQL generation completed".to_string());
                sql
            }
            Err(e) => {
                return DetailedResult {
                    result: Err(e),
                    warnings: warnings.clone(),
                    metadata: Some(EnhancedTransformationMetadata {
                        transformations_applied,
                        warnings: warnings.clone(),
                        performance_metrics: PerformanceMetrics {
                            parse_time_ms: parse_time,
                            transform_time_ms: transform_start.elapsed().as_millis() as u64,
                            total_time_ms: start_time.elapsed().as_millis() as u64,
                        },
                    }),
                };
            }
        };

        // Apply post-processing rules
        hana_sql = match self.transformer.apply_post_processing_rules(&hana_sql) {
            Ok(sql) => {
                transformations_applied.push("Post-processing rules applied".to_string());
                sql
            }
            Err(_e) => {
                warnings.push("Post-processing failed, using pre-processed result".to_string());
                hana_sql // Continue with unprocessed result
            }
        };

        let total_time = start_time.elapsed().as_millis() as u64;
        let transform_time = transform_start.elapsed().as_millis() as u64;

        info!("Detailed transformation completed in {}ms", total_time);

        DetailedResult {
            result: Ok(hana_sql),
            warnings: warnings.clone(),
            metadata: Some(EnhancedTransformationMetadata {
                transformations_applied,
                warnings: warnings.clone(),
                performance_metrics: PerformanceMetrics {
                    parse_time_ms: parse_time,
                    transform_time_ms: transform_time,
                    total_time_ms: total_time,
                },
            }),
        }
    }

    /// Extract line and column information from parser error message
    fn extract_position_from_error(error: &str) -> (usize, usize) {
        // Try to extract line:column from error message
        // sqlparser errors often contain position information
        use regex::Regex;

        if let Ok(re) = Regex::new(r"line (\d+).*column (\d+)") {
            if let Some(captures) = re.captures(error) {
                let line = captures
                    .get(1)
                    .and_then(|m| m.as_str().parse().ok())
                    .unwrap_or(0);
                let column = captures
                    .get(2)
                    .and_then(|m| m.as_str().parse().ok())
                    .unwrap_or(0);
                return (line, column);
            }
        }

        // Try alternative pattern
        if let Ok(re) = Regex::new(r"at position (\d+)") {
            if let Some(captures) = re.captures(error) {
                let position = captures
                    .get(1)
                    .and_then(|m| m.as_str().parse().ok())
                    .unwrap_or(0);
                // Convert position to approximate line (assuming ~50 chars per line)
                let line = position / 50 + 1;
                let column = position % 50;
                return (line, column);
            }
        }

        (1, 0) // Default to line 1, column 0
    }

    fn generate_sql(
        &self,
        statements: &[sqlparser::ast::Statement],
    ) -> TransformationResult<String> {
        // Use our minimal generator to convert statements to SQL
        let sql = generator::generate_sql(&statements)?;
        Ok(sql)
    }

    /// Create a transformer with configuration loaded from file
    pub fn from_config_file<P: AsRef<std::path::Path>>(path: P) -> TransformationResult<Self> {
        let config = TransformationConfig::from_file(path)?;
        Self::new(config, Dialect::default()).map_err(|e| e)
    }

    /// Create a transformer with configuration from environment variables
    pub fn from_environment() -> Result<Self, TransformationError> {
        let config = TransformationConfig::from_env();
        Self::new(config, Dialect::default())
    }

    /// Builder-style constructor for common configurations
    pub fn builder() -> SqlTransformerBuilder {
        SqlTransformerBuilder::new()
    }

    /// Clear internal caches to free memory - useful for long-running applications
    pub fn clear_caches(&self) {
        self.parser.clear_cache();
    }

    /// Get cache statistics for monitoring performance
    pub fn cache_stats(&self) -> (usize, usize) {
        if let Ok(cache) = self.parser.parse_cache.lock() {
            (cache.len(), cache.capacity())
        } else {
            (0, 0)
        }
    }

    /// Validate SQL against HANA compatibility rules
    pub fn validate_hana_compatibility(&self, sql: &str) -> TransformationResult<Vec<String>> {
        debug!("Validating HANA compatibility for SQL");

        // Parse SQL first
        let dialect = PostgreSqlDialect {};
        let statements = Parser::parse_sql(&dialect, sql).map_err(|e| {
            let error_str = e.to_string();
            let (line, column) = Self::extract_position_from_error(&error_str);

            TransformationError::ParseError {
                message: error_str,
                line,
                column,
            }
        })?;

        // Validate each statement against HANA rules
        let mut validation_results = Vec::new();

        for (idx, stmt) in statements.iter().enumerate() {
            match self.transformer.validate_statement_for_hana(stmt) {
                Ok(warnings) => validation_results.extend(warnings),
                Err(e) => {
                    validation_results.push(format!("Statement {}: {}", idx + 1, e));
                }
            }
        }

        Ok(validation_results)
    }
}

impl Default for SqlTransformer {
    fn default() -> Self {
        Self::new(TransformationConfig::default(), Dialect::default())
            .expect("Failed to create default SqlTransformer")
    }
}

/// Builder for SqlTransformer to make configuration easier
pub struct SqlTransformerBuilder {
    config: TransformationConfig,
    dialect: Dialect,
}

impl SqlTransformerBuilder {
    fn new() -> Self {
        Self {
            config: TransformationConfig::default(),
            dialect: Dialect::default(),
        }
    }

    /// Set the target dialect
    pub fn with_dialect(mut self, dialect: Dialect) -> Self {
        self.dialect = dialect;
        self
    }

    /// Enable or disable data type transformations
    pub fn with_data_types(mut self, enabled: bool) -> Self {
        self.config.data_types.preserve_precision = enabled;
        self
    }

    /// Enable or disable function transformations
    pub fn with_functions(mut self, enabled: bool) -> Self {
        self.config.functions.enable_custom_functions = enabled;
        self
    }

    /// Set schema mappings
    pub fn with_schema_mapping(mut self, from: &str, to: &str) -> Self {
        self.config
            .schema_handling
            .schema_mappings
            .insert(from.to_string(), to.to_string());
        self
    }

    /// Build the SqlTransformer
    pub fn build(self) -> Result<SqlTransformer, TransformationError> {
        SqlTransformer::new(self.config, self.dialect)
    }
}

impl Default for SqlTransformerBuilder {
    fn default() -> Self {
        Self::new()
    }
}
