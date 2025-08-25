use crate::error::TransformationResult;
use regex::Regex;

/// Post-processor to fix SQL formatting issues from sqlparser
pub struct PostProcessor;

impl PostProcessor {
    pub fn new() -> Self {
        Self
    }

    /// Apply post-processing fixes to SQL string
    pub fn process(&self, sql: &str) -> TransformationResult<String> {
        let mut result = sql.to_string();

        // Fix FULL OUTER JOIN formatting issue
        // sqlparser outputs "FULL JOIN" but we want "FULL OUTER JOIN" for HANA compatibility
        result = self.fix_full_outer_join(&result)?;

        // Fix INDEX USING clause removal
        // Remove USING btree/gin/etc clauses from CREATE INDEX statements
        result = self.fix_index_using_clause(&result)?;

        Ok(result)
    }

    /// Fix FULL OUTER JOIN formatting
    fn fix_full_outer_join(&self, sql: &str) -> TransformationResult<String> {
        // Replace "FULL JOIN" with "FULL OUTER JOIN" but be careful not to replace
        // cases where it's actually supposed to be "FULL JOIN" in other contexts
        let regex = Regex::new(r"\bFULL\s+JOIN\b").map_err(|e| {
            crate::error::TransformationError::ParseError {
                message: format!("Regex error: {}", e),
                line: 0,
                column: 0,
            }
        })?;

        Ok(regex.replace_all(sql, "FULL OUTER JOIN").to_string())
    }

    /// Remove USING clause from CREATE INDEX statements
    fn fix_index_using_clause(&self, sql: &str) -> TransformationResult<String> {
        // Remove "USING btree", "USING gin", "USING BTREE", "USING GIN", etc.
        let regex = Regex::new(
            r"\bUSING\s+(?:btree|gin|hash|gist|spgist|brin|BTREE|GIN|HASH|GIST|SPGIST|BRIN)\b",
        )
        .map_err(|e| crate::error::TransformationError::ParseError {
            message: format!("Regex error: {}", e),
            line: 0,
            column: 0,
        })?;

        // Replace with empty string and clean up extra spaces
        let result = regex.replace_all(sql, "").to_string();

        // Clean up any double spaces that might have been left
        let cleanup_regex =
            Regex::new(r"\s+").map_err(|e| crate::error::TransformationError::ParseError {
                message: format!("Regex error: {}", e),
                line: 0,
                column: 0,
            })?;

        Ok(cleanup_regex.replace_all(&result, " ").trim().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fix_full_outer_join() {
        let processor = PostProcessor::new();

        let sql = "SELECT * FROM users AS u FULL JOIN profiles AS p ON u.id = p.user_id;";
        let result = processor.fix_full_outer_join(sql).unwrap();
        assert_eq!(
            result,
            "SELECT * FROM users AS u FULL OUTER JOIN profiles AS p ON u.id = p.user_id;"
        );
    }

    #[test]
    fn test_fix_index_using_clause() {
        let processor = PostProcessor::new();

        let sql = "CREATE INDEX idx_users_email ON users USING BTREE (email);";
        let result = processor.fix_index_using_clause(sql).unwrap();
        assert_eq!(result, "CREATE INDEX idx_users_email ON users (email);");

        let sql2 = "CREATE INDEX idx_users_data ON users USING gin (data);";
        let result2 = processor.fix_index_using_clause(sql2).unwrap();
        assert_eq!(result2, "CREATE INDEX idx_users_data ON users (data);");
    }

    #[test]
    fn test_full_process() {
        let processor = PostProcessor::new();

        let sql = "SELECT * FROM users AS u FULL JOIN profiles AS p ON u.id = p.user_id; CREATE INDEX idx_users_email ON users USING BTREE (email);";
        let result = processor.process(sql).unwrap();
        assert!(result.contains("FULL OUTER JOIN"));
        assert!(!result.contains("USING BTREE"));
    }
}
