use crate::error::{TransformationError, TransformationResult};
use sqlparser::dialect::PostgreSqlDialect;
use sqlparser::parser::Parser;

/// PostgreSQL SQL parser wrapper
pub struct PostgreSqlParser {
    dialect: PostgreSqlDialect,
}

impl PostgreSqlParser {
    /// Create a new PostgreSQL parser
    pub fn new() -> Self {
        Self {
            dialect: PostgreSqlDialect {},
        }
    }

    /// Parse PostgreSQL SQL into AST
    pub fn parse(&self, sql: &str) -> TransformationResult<Vec<sqlparser::ast::Statement>> {
        Parser::parse_sql(&self.dialect, sql).map_err(|e| TransformationError::ParseError {
            message: e.to_string(),
            line: 0, // TODO: Extract actual line/column from error
            column: 0,
        })
    }

    /// Validate PostgreSQL SQL syntax without full parsing
    pub fn validate_syntax(&self, sql: &str) -> TransformationResult<()> {
        self.parse(sql)?;
        Ok(())
    }

    /// Parse a single statement
    pub fn parse_statement(&self, sql: &str) -> TransformationResult<sqlparser::ast::Statement> {
        let statements = self.parse(sql)?;

        if statements.is_empty() {
            return Err(TransformationError::ParseError {
                message: "No statements found".to_string(),
                line: 0,
                column: 0,
            });
        }

        if statements.len() > 1 {
            return Err(TransformationError::ParseError {
                message: "Multiple statements found, expected single statement".to_string(),
                line: 0,
                column: 0,
            });
        }

        Ok(statements.into_iter().next().unwrap())
    }
}

impl Default for PostgreSqlParser {
    fn default() -> Self {
        Self::new()
    }
}
