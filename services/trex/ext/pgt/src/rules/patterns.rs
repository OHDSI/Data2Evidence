use crate::error::TransformationResult;
use regex::Regex;

/// Pattern-based SQL transformations
pub struct PatternTransformer {
    patterns: Vec<TransformationPattern>,
}

impl PatternTransformer {
    pub fn new() -> Self {
        let mut transformer = Self {
            patterns: Vec::new(),
        };

        transformer.add_default_patterns();
        transformer
    }

    /// Add default transformation patterns
    fn add_default_patterns(&mut self) {
        // LIMIT/OFFSET transformation
        self.add_pattern(TransformationPattern::new(
            "limit_offset",
            r"LIMIT\s+(\d+)\s+OFFSET\s+(\d+)",
            "LIMIT $2, $1",
            "Transform PostgreSQL LIMIT/OFFSET to HANA syntax",
        ));

        // ILIKE to case-insensitive LIKE
        self.add_pattern(TransformationPattern::new(
            "ilike_transform",
            r"(\w+)\s+ILIKE\s+'([^']*)'",
            "UPPER($1) LIKE UPPER('$2')",
            "Transform ILIKE to case-insensitive LIKE",
        ));

        // Boolean literals
        self.add_pattern(TransformationPattern::new(
            "boolean_true",
            r"\btrue\b",
            "TRUE",
            "Standardize boolean true literal",
        ));

        self.add_pattern(TransformationPattern::new(
            "boolean_false",
            r"\bfalse\b",
            "FALSE",
            "Standardize boolean false literal",
        ));

        // EXTRACT function transformations
        self.add_pattern(TransformationPattern::new(
            "extract_dow",
            r"EXTRACT\(\s*dow\s+FROM\s+([^)]+)\)",
            "WEEKDAY($1)",
            "Transform EXTRACT(dow FROM date) to WEEKDAY(date)",
        ));

        self.add_pattern(TransformationPattern::new(
            "extract_doy",
            r"EXTRACT\(\s*doy\s+FROM\s+([^)]+)\)",
            "DAYOFYEAR($1)",
            "Transform EXTRACT(doy FROM date) to DAYOFYEAR(date)",
        ));

        self.add_pattern(TransformationPattern::new(
            "extract_epoch",
            r"EXTRACT\(\s*epoch\s+FROM\s+([^)]+)\)",
            "SECONDS_BETWEEN('1970-01-01 00:00:00', $1)",
            "Transform EXTRACT(epoch FROM timestamp) to SECONDS_BETWEEN",
        ));

        // PostgreSQL-specific operators to functions
        self.add_pattern(TransformationPattern::new(
            "regex_match",
            r"(\w+)\s*~\s*'([^']*)'",
            "LOCATE_REGEXPR('$2', $1) > 0",
            "Transform regex match operator to LOCATE_REGEXPR function",
        ));

        self.add_pattern(TransformationPattern::new(
            "regex_match_case_insensitive",
            r"(\w+)\s*~\*\s*'([^']*)'",
            "LOCATE_REGEXPR('$2', $1, 1, 1, '', 'i') > 0",
            "Transform case-insensitive regex match to LOCATE_REGEXPR with flag",
        ));

        // String concatenation with ||
        self.add_pattern(TransformationPattern::new(
            "string_concat_null_handling",
            r"(\w+)\s*\|\|\s*(\w+)",
            "CONCAT($1, $2)",
            "Transform || operator to CONCAT function for better null handling",
        ));

        // POSITION function transformation
        self.add_pattern(TransformationPattern::new(
            "position_function",
            r"POSITION\(\s*'([^']*)'\s+IN\s+(\w+)\)",
            "LOCATE('$1', $2)",
            "Transform POSITION(substring IN string) to LOCATE(substring, string)",
        ));

        // SUBSTRING with FROM/FOR syntax
        self.add_pattern(TransformationPattern::new(
            "substring_from_for",
            r"SUBSTRING\(\s*(\w+)\s+FROM\s+(\d+)\s+FOR\s+(\d+)\)",
            "SUBSTRING($1, $2, $3)",
            "Transform SUBSTRING(string FROM start FOR length) to SUBSTRING(string, start, length)",
        ));

        // Array access (convert to string manipulation)
        self.add_pattern(TransformationPattern::new(
            "array_access",
            r"(\w+)\[(\d+)\]",
            "SPLIT_PART($1, ',', $2)",
            "Transform array access to string splitting (assuming comma-separated values)",
        ));

        // Date/time arithmetic
        self.add_pattern(TransformationPattern::new(
            "interval_addition",
            r"(\w+)\s*\+\s*INTERVAL\s+'(\d+)'\s+(\w+)",
            "ADD_$3($1, $2)",
            "Transform date + INTERVAL to HANA date functions",
        ));

        // COALESCE optimization for PostgreSQL patterns
        self.add_pattern(TransformationPattern::new(
            "coalesce_empty_string",
            r"COALESCE\(\s*(\w+),\s*''\s*\)",
            "IFNULL($1, '')",
            "Transform COALESCE with empty string to IFNULL",
        ));
    }

    /// Add a transformation pattern
    pub fn add_pattern(&mut self, pattern: TransformationPattern) {
        self.patterns.push(pattern);
    }

    /// Apply all patterns to transform SQL
    pub fn transform(&self, sql: &str) -> TransformationResult<String> {
        let mut result = sql.to_string();
        let mut applied_transformations = Vec::new();

        for pattern in &self.patterns {
            match pattern.apply(&result) {
                Ok((transformed, applied)) => {
                    if applied {
                        applied_transformations.push(pattern.name.clone());
                        result = transformed;
                    }
                }
                Err(e) => {
                    log::warn!("Pattern '{}' failed to apply: {}", pattern.name, e);
                }
            }
        }

        if !applied_transformations.is_empty() {
            log::info!(
                "Applied transformations: {}",
                applied_transformations.join(", ")
            );
        }

        Ok(result)
    }

    /// Get all available patterns
    pub fn patterns(&self) -> &[TransformationPattern] {
        &self.patterns
    }
}

impl Default for PatternTransformer {
    fn default() -> Self {
        Self::new()
    }
}

/// A single transformation pattern
pub struct TransformationPattern {
    pub name: String,
    pub description: String,
    regex: Regex,
    replacement: String,
}

impl TransformationPattern {
    pub fn new(name: &str, pattern: &str, replacement: &str, description: &str) -> Self {
        let regex = Regex::new(pattern)
            .unwrap_or_else(|e| panic!("Invalid regex pattern '{}': {}", pattern, e));

        Self {
            name: name.to_string(),
            description: description.to_string(),
            regex,
            replacement: replacement.to_string(),
        }
    }

    /// Apply this pattern to the input SQL
    pub fn apply(&self, sql: &str) -> TransformationResult<(String, bool)> {
        if self.regex.is_match(sql) {
            let result = self.regex.replace_all(sql, &self.replacement).to_string();
            Ok((result, true))
        } else {
            Ok((sql.to_string(), false))
        }
    }

    /// Check if this pattern matches the input
    pub fn matches(&self, sql: &str) -> bool {
        self.regex.is_match(sql)
    }

    /// Get the regex pattern as a string
    pub fn pattern(&self) -> String {
        self.regex.as_str().to_string()
    }

    /// Get the replacement string
    pub fn replacement(&self) -> &str {
        &self.replacement
    }
}

/// Conditional pattern transformer that applies patterns based on context
pub struct ConditionalPatternTransformer {
    patterns: Vec<ConditionalPattern>,
}

impl ConditionalPatternTransformer {
    pub fn new() -> Self {
        Self {
            patterns: Vec::new(),
        }
    }

    /// Add a conditional pattern
    pub fn add_conditional_pattern(&mut self, pattern: ConditionalPattern) {
        self.patterns.push(pattern);
    }

    /// Transform SQL based on conditional patterns
    pub fn transform(
        &self,
        sql: &str,
        context: &TransformationContext,
    ) -> TransformationResult<String> {
        let mut result = sql.to_string();

        for pattern in &self.patterns {
            if pattern.should_apply(context) {
                match pattern.pattern.apply(&result) {
                    Ok((transformed, applied)) => {
                        if applied {
                            result = transformed;
                            log::debug!("Applied conditional pattern: {}", pattern.pattern.name);
                        }
                    }
                    Err(e) => {
                        log::warn!(
                            "Conditional pattern '{}' failed: {}",
                            pattern.pattern.name,
                            e
                        );
                    }
                }
            }
        }

        Ok(result)
    }
}

impl Default for ConditionalPatternTransformer {
    fn default() -> Self {
        Self::new()
    }
}

/// A transformation pattern with application conditions
pub struct ConditionalPattern {
    pub pattern: TransformationPattern,
    pub conditions: Vec<PatternCondition>,
}

impl ConditionalPattern {
    pub fn new(pattern: TransformationPattern) -> Self {
        Self {
            pattern,
            conditions: Vec::new(),
        }
    }

    pub fn with_condition(mut self, condition: PatternCondition) -> Self {
        self.conditions.push(condition);
        self
    }

    /// Check if this pattern should be applied given the context
    pub fn should_apply(&self, context: &TransformationContext) -> bool {
        if self.conditions.is_empty() {
            return true; // No conditions means always apply
        }

        self.conditions
            .iter()
            .all(|condition| condition.matches(context))
    }
}

/// Condition for applying a pattern
pub enum PatternCondition {
    StatementType(String),
    ContextContains(String),
    NotInContext(String),
    InFunction(String),
    InClause(String),
}

impl PatternCondition {
    pub fn matches(&self, context: &TransformationContext) -> bool {
        match self {
            PatternCondition::StatementType(stmt_type) => context
                .statement_type
                .as_ref()
                .map(|st| st.eq_ignore_ascii_case(stmt_type))
                .unwrap_or(false),
            PatternCondition::ContextContains(text) => context.full_sql.contains(text),
            PatternCondition::NotInContext(text) => !context.full_sql.contains(text),
            PatternCondition::InFunction(func_name) => context
                .current_function
                .as_ref()
                .map(|cf| cf.eq_ignore_ascii_case(func_name))
                .unwrap_or(false),
            PatternCondition::InClause(clause_name) => context
                .current_clause
                .as_ref()
                .map(|cc| cc.eq_ignore_ascii_case(clause_name))
                .unwrap_or(false),
        }
    }
}

/// Context information for pattern application
pub struct TransformationContext {
    pub statement_type: Option<String>,
    pub current_function: Option<String>,
    pub current_clause: Option<String>,
    pub full_sql: String,
    pub metadata: std::collections::HashMap<String, String>,
}

impl TransformationContext {
    pub fn new(sql: &str) -> Self {
        Self {
            statement_type: None,
            current_function: None,
            current_clause: None,
            full_sql: sql.to_string(),
            metadata: std::collections::HashMap::new(),
        }
    }

    pub fn with_statement_type(mut self, stmt_type: &str) -> Self {
        self.statement_type = Some(stmt_type.to_string());
        self
    }

    pub fn with_function(mut self, function: &str) -> Self {
        self.current_function = Some(function.to_string());
        self
    }

    pub fn with_clause(mut self, clause: &str) -> Self {
        self.current_clause = Some(clause.to_string());
        self
    }

    pub fn add_metadata(mut self, key: &str, value: &str) -> Self {
        self.metadata.insert(key.to_string(), value.to_string());
        self
    }
}
