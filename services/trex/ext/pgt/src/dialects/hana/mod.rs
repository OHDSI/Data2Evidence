pub mod data_types;
pub mod expressions;
pub mod functions;
pub mod post_processor;
pub mod statements;

use crate::config::TransformationConfig;
use crate::error::{TransformationError, TransformationResult, TransformationWarning};
use crate::rules::TransformationRules;
use sqlparser::ast::Statement;
use std::time::Duration;

/// Result of a complete transformation operation
pub struct DetailedTransformationResult {
    pub sql: Option<String>,
    pub errors: Vec<TransformationError>,
    pub warnings: Vec<TransformationWarning>,
    pub metadata: TransformationMetadata,
}

/// Metadata about the transformation process
#[derive(Debug, Clone)]
pub struct TransformationMetadata {
    pub input_statements: usize,
    pub transformed_statements: usize,
    pub skipped_statements: usize,
    pub transformation_time: Duration,
}

/// Trait for transforming SQL statements
pub trait Transformer {
    /// Get the name of this transformer
    fn name(&self) -> &'static str;

    /// Transform a statement, returning true if any changes were made
    fn transform(&self, stmt: &mut Statement) -> TransformationResult<bool>;

    /// Check if this transformer supports the given statement type
    fn supports_statement_type(&self, stmt: &Statement) -> bool;

    /// Get the execution priority (lower numbers execute first)
    fn priority(&self) -> u8 {
        100
    }

    /// Collect any warnings during transformation
    fn collect_warnings(&self) -> Vec<TransformationWarning> {
        Vec::new()
    }
}

/// Main transformation engine that orchestrates all transformers
pub struct TransformationEngine {
    transformers: Vec<Box<dyn Transformer>>,
    config: TransformationConfig,
    rules: TransformationRules,
}

impl TransformationEngine {
    /// Create a new transformation engine with the given configuration
    pub fn new(config: &TransformationConfig) -> Self {
        let mut transformers: Vec<Box<dyn Transformer>> = vec![
            Box::new(data_types::DataTypeTransformer::new(config)),
            Box::new(functions::FunctionTransformer::new(config)),
            Box::new(statements::StatementTransformer::new(config)),
            Box::new(expressions::ExpressionTransformer::new(config)),
        ];

        // Sort transformers by priority
        transformers.sort_by_key(|t| t.priority());

        Self {
            transformers,
            config: config.clone(),
            rules: TransformationRules::new(config.rules.clone()),
        }
    }

    /// Transform a single statement
    pub fn transform_statement(&self, mut stmt: Statement) -> TransformationResult<Statement> {
        let mut warnings = Vec::new();
        let mut any_changes = false;

        for transformer in &self.transformers {
            if transformer.supports_statement_type(&stmt) {
                match transformer.transform(&mut stmt) {
                    Ok(changed) => {
                        if changed {
                            any_changes = true;
                        }
                    }
                    Err(e) => {
                        // Log the error but continue with other transformers
                        log::warn!("Transformer '{}' failed: {}", transformer.name(), e);
                        warnings.push(TransformationWarning::high(&format!(
                            "Transformer '{}' failed: {}",
                            transformer.name(),
                            e
                        )));
                    }
                }
            }
        }

        if !warnings.is_empty() {
            log::info!("Transformation completed with {} warnings", warnings.len());
        }

        Ok(stmt)
    }

    /// Transform multiple statements with rules engine validation
    pub fn transform_statements(
        &self,
        statements: &[Statement],
    ) -> TransformationResult<Vec<Statement>> {
        let start_time = std::time::Instant::now();

        // First, validate HANA compatibility if enabled
        self.rules.validate_hana_compatibility(statements)?;

        let mut transformed_statements = Vec::new();
        let mut errors = Vec::new();

        for (index, stmt) in statements.iter().enumerate() {
            match self.transform_statement(stmt.clone()) {
                Ok(transformed_stmt) => {
                    transformed_statements.push(transformed_stmt);
                }
                Err(e) => {
                    if self.config.rules.enable_strict_mode {
                        // In strict mode, fail on any error
                        return Err(e);
                    } else {
                        // In lenient mode, collect errors and continue
                        errors.push(e);
                        log::warn!(
                            "Failed to transform statement {}: continuing with original",
                            index
                        );
                        transformed_statements.push(stmt.clone());
                    }
                }
            }
        }

        // If we collected errors in lenient mode, return partial transformation error
        if !errors.is_empty() {
            return Err(TransformationError::partial_transformation(
                transformed_statements.len() - errors.len(),
                errors.len(),
                None, // SQL will be generated later
                errors,
            ));
        }

        Ok(transformed_statements)
    }

    /// Apply rules-based post-processing to transformed SQL
    pub fn apply_post_processing_rules(&self, sql: &str) -> TransformationResult<String> {
        self.rules.apply_transformation_rules(sql)
    }

    /// Validate a single statement for HANA compatibility
    pub fn validate_statement_for_hana(
        &self,
        stmt: &Statement,
    ) -> TransformationResult<Vec<String>> {
        self.rules
            .validate_hana_compatibility(&[stmt.clone()])
            .map(|_| Vec::new())
    }
}

/// Wrapper for HANA TransformationEngine that implements DialectTransformationEngine
pub struct HanaTransformationEngine {
    engine: TransformationEngine,
}

impl HanaTransformationEngine {
    /// Create a new HANA transformation engine
    pub fn new(config: &TransformationConfig) -> Self {
        Self {
            engine: TransformationEngine::new(config),
        }
    }
}

impl super::DialectTransformationEngine for HanaTransformationEngine {
    fn dialect(&self) -> super::Dialect {
        super::Dialect::Hana
    }

    fn transform_statement(&self, stmt: Statement) -> TransformationResult<Statement> {
        self.engine.transform_statement(stmt)
    }

    fn transform_statements(&self, statements: &[Statement]) -> TransformationResult<Vec<Statement>> {
        self.engine.transform_statements(statements)
    }

    fn apply_post_processing_rules(&self, sql: &str) -> TransformationResult<String> {
        self.engine.apply_post_processing_rules(sql)
    }

    fn validate_statement_for_hana(&self, stmt: &Statement) -> TransformationResult<Vec<String>> {
        self.engine.validate_statement_for_hana(stmt)
    }

    fn name(&self) -> &'static str {
        "HANA Transformation Engine"
    }
}

/// Helper trait for visiting AST nodes
pub trait AstVisitor<T> {
    fn visit(&mut self, node: &mut T) -> TransformationResult<bool>;
}

/// Helper trait for collecting transformation statistics
pub trait TransformationStats {
    fn transformations_applied(&self) -> usize;
    fn warnings_generated(&self) -> usize;
    fn processing_time(&self) -> Duration;
}
