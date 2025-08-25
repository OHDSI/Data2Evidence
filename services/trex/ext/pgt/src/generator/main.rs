use crate::error::TransformationResult;
use crate::dialects::hana::post_processor::PostProcessor;
use sqlparser::ast::Statement;

/// Generate HANA SQL from AST statements using built-in formatting with post-processing
pub fn generate_hana_sql(statements: &[Statement]) -> TransformationResult<String> {
    let mut result = String::new();

    for (i, stmt) in statements.iter().enumerate() {
        if i > 0 {
            result.push_str(";\n\n");
        }

        // Use sqlparser's built-in Display trait for formatting
        // This is reliable and compatible with the current version
        result.push_str(&format!("{}", stmt));
    }

    if !statements.is_empty() {
        result.push(';');
    }

    // Apply post-processing to fix formatting issues
    let post_processor = PostProcessor::new();
    let processed_sql = post_processor.process(&result)?;

    Ok(processed_sql)
}
