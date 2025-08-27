pub mod dialect;
pub mod main;

use crate::error::TransformationResult;
use sqlparser::ast::Statement;

/// Generate HANA SQL from AST statements
pub fn generate_sql(statements: &[Statement]) -> TransformationResult<String> {
    main::generate_hana_sql(statements)
}
