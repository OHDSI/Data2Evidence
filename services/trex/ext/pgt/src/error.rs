use thiserror::Error;

/// Main error type for transformation operations
#[derive(Error, Debug)]
pub enum TransformationError {
    #[error("Parse error: {message} at line {line}, column {column}")]
    ParseError {
        message: String,
        line: usize,
        column: usize,
    },

    #[error("Unsupported PostgreSQL feature: {feature}. Context: {context}")]
    UnsupportedFeature {
        feature: String,
        context: String,
        suggestion: Option<String>,
    },

    #[error("Data type transformation failed: {pg_type} -> {suggested_hana_type}: {context}")]
    DataTypeError {
        pg_type: String,
        suggested_hana_type: String,
        context: String,
    },

    #[error("Function transformation failed: {function}: {reason}")]
    FunctionError { function: String, reason: String },

    #[error("Configuration error: {message}")]
    ConfigError { message: String },

    #[error("HANA validation failed: {hana_rule_violations:?}")]
    ValidationError {
        hana_rule_violations: Vec<String>,
        suggestions: Vec<String>,
    },

    #[error("Partial transformation completed: {succeeded_statements} succeeded, {failed_statements} failed")]
    PartialTransformation {
        succeeded_statements: usize,
        failed_statements: usize,
        transformed_sql: Option<String>,
        errors: Vec<TransformationError>,
    },

    #[error("Schema transformation error: {message}")]
    SchemaError { message: String },

    #[error("Expression transformation error: {message}")]
    ExpressionError { message: String },

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[cfg(feature = "json_output")]
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}

/// Warning that doesn't prevent transformation but should be noted
#[derive(Debug, Clone)]
pub struct TransformationWarning {
    pub message: String,
    pub location: Option<SourceLocation>,
    pub severity: WarningSeverity,
}

/// Severity level for warnings
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WarningSeverity {
    Low,
    Medium,
    High,
}

/// Source location information for errors and warnings
#[derive(Debug, Clone)]
pub struct SourceLocation {
    pub line: usize,
    pub column: usize,
    pub file: Option<String>,
}

/// Result type for transformation operations
pub type TransformationResult<T> = Result<T, TransformationError>;

impl Clone for TransformationError {
    fn clone(&self) -> Self {
        match self {
            Self::ParseError {
                message,
                line,
                column,
            } => Self::ParseError {
                message: message.clone(),
                line: *line,
                column: *column,
            },
            Self::UnsupportedFeature {
                feature,
                context,
                suggestion,
            } => Self::UnsupportedFeature {
                feature: feature.clone(),
                context: context.clone(),
                suggestion: suggestion.clone(),
            },
            Self::DataTypeError {
                pg_type,
                suggested_hana_type,
                context,
            } => Self::DataTypeError {
                pg_type: pg_type.clone(),
                suggested_hana_type: suggested_hana_type.clone(),
                context: context.clone(),
            },
            Self::FunctionError { function, reason } => Self::FunctionError {
                function: function.clone(),
                reason: reason.clone(),
            },
            Self::ConfigError { message } => Self::ConfigError {
                message: message.clone(),
            },
            Self::ValidationError {
                hana_rule_violations,
                suggestions,
            } => Self::ValidationError {
                hana_rule_violations: hana_rule_violations.clone(),
                suggestions: suggestions.clone(),
            },
            Self::PartialTransformation {
                succeeded_statements,
                failed_statements,
                transformed_sql,
                errors,
            } => Self::PartialTransformation {
                succeeded_statements: *succeeded_statements,
                failed_statements: *failed_statements,
                transformed_sql: transformed_sql.clone(),
                errors: errors.clone(),
            },
            Self::SchemaError { message } => Self::SchemaError {
                message: message.clone(),
            },
            Self::ExpressionError { message } => Self::ExpressionError {
                message: message.clone(),
            },
            Self::IoError(e) => Self::IoError(std::io::Error::new(e.kind(), e.to_string())),
            #[cfg(feature = "json_output")]
            Self::SerializationError(e) => {
                Self::SerializationError(serde_json::Error::custom(e.to_string()))
            }
        }
    }
}

impl TransformationError {
    /// Create a new unsupported feature error
    pub fn unsupported(feature: &str) -> Self {
        Self::UnsupportedFeature {
            feature: feature.to_string(),
            context: String::new(),
            suggestion: None,
        }
    }

    /// Create a new unsupported feature error with context and suggestion
    pub fn unsupported_with_context(
        feature: &str,
        context: &str,
        suggestion: Option<&str>,
    ) -> Self {
        Self::UnsupportedFeature {
            feature: feature.to_string(),
            context: context.to_string(),
            suggestion: suggestion.map(|s| s.to_string()),
        }
    }

    /// Create a new data type error
    pub fn data_type(pg_type: &str, suggested_hana_type: &str, context: &str) -> Self {
        Self::DataTypeError {
            pg_type: pg_type.to_string(),
            suggested_hana_type: suggested_hana_type.to_string(),
            context: context.to_string(),
        }
    }

    /// Create a new function error
    pub fn function(function: &str, reason: &str) -> Self {
        Self::FunctionError {
            function: function.to_string(),
            reason: reason.to_string(),
        }
    }

    /// Create a new validation error
    pub fn validation(hana_rule_violations: Vec<String>, suggestions: Vec<String>) -> Self {
        Self::ValidationError {
            hana_rule_violations,
            suggestions,
        }
    }

    /// Create a new partial transformation error
    pub fn partial_transformation(
        succeeded: usize,
        failed: usize,
        transformed_sql: Option<String>,
        errors: Vec<TransformationError>,
    ) -> Self {
        Self::PartialTransformation {
            succeeded_statements: succeeded,
            failed_statements: failed,
            transformed_sql,
            errors,
        }
    }

    /// Create a new configuration error
    pub fn config(message: &str) -> Self {
        Self::ConfigError {
            message: message.to_string(),
        }
    }
}

impl TransformationWarning {
    /// Create a new warning
    pub fn new(message: &str, severity: WarningSeverity) -> Self {
        Self {
            message: message.to_string(),
            location: None,
            severity,
        }
    }

    /// Create a new warning with location
    pub fn with_location(
        message: &str,
        severity: WarningSeverity,
        location: SourceLocation,
    ) -> Self {
        Self {
            message: message.to_string(),
            location: Some(location),
            severity,
        }
    }

    /// Create a low severity warning
    pub fn low(message: &str) -> Self {
        Self::new(message, WarningSeverity::Low)
    }

    /// Create a medium severity warning
    pub fn medium(message: &str) -> Self {
        Self::new(message, WarningSeverity::Medium)
    }

    /// Create a high severity warning
    pub fn high(message: &str) -> Self {
        Self::new(message, WarningSeverity::High)
    }
}

impl std::fmt::Display for TransformationWarning {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{:?}] {}", self.severity, self.message)?;
        if let Some(location) = &self.location {
            write!(f, " at line {}, column {}", location.line, location.column)?;
            if let Some(file) = &location.file {
                write!(f, " in {}", file)?;
            }
        }
        Ok(())
    }
}

impl SourceLocation {
    /// Create a new source location
    pub fn new(line: usize, column: usize) -> Self {
        Self {
            line,
            column,
            file: None,
        }
    }

    /// Create a new source location with file
    pub fn with_file(line: usize, column: usize, file: &str) -> Self {
        Self {
            line,
            column,
            file: Some(file.to_string()),
        }
    }
}

/// Performance metrics for transformation operations
#[derive(Debug, Clone, Default)]
pub struct PerformanceMetrics {
    pub parse_time_ms: u64,
    pub transform_time_ms: u64,
    pub total_time_ms: u64,
}

/// Detailed result with metadata and warnings for Phase 3C
#[derive(Debug, Clone)]
pub struct DetailedResult<T> {
    pub result: TransformationResult<T>,
    pub warnings: Vec<String>,
    pub metadata: Option<EnhancedTransformationMetadata>,
}

/// Enhanced metadata for Phase 3C features
#[derive(Debug, Clone)]
pub struct EnhancedTransformationMetadata {
    pub transformations_applied: Vec<String>,
    pub warnings: Vec<String>,
    pub performance_metrics: PerformanceMetrics,
}
