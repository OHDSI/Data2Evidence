use crate::dialects::{Dialect, DialectTransformationEngine};
use crate::config::TransformationConfig;
use crate::error::TransformationResult;
use regex::Regex;
use sqlparser::ast::Statement;

/// DuckDB transformation engine that transforms PostgreSQL patterns to DuckDB syntax
pub struct DuckDbTransformationEngine {
    _config: TransformationConfig,
    transformation_rules: Vec<(Regex, String)>,
}

impl DuckDbTransformationEngine {
    /// Create a new DuckDB transformation engine with PostgreSQL to DuckDB patterns
    pub fn new(config: &TransformationConfig) -> Self {
        // Initialize regex transformation rules from PostgreSQL to DuckDB patterns
        let transformation_rules = Self::create_transformation_rules();
        
        Self {
            _config: config.clone(),
            transformation_rules,
        }
    }
    
    /// Create regex-based transformation rules from PostgreSQL to DuckDB patterns
    fn create_transformation_rules() -> Vec<(Regex, String)> {
        let patterns = vec![
            // Date/time casting patterns
            (r"CAST\('([^']+)' \+ ([^)]+) AS DATE\)", "CAST(strptime('$1' + $2, '%Y%m%d') AS DATE)"),
            (r"CAST\('([^']+)' AS DATE\)", "CAST(strptime('$1', '%Y%m%d') AS DATE)"),
            (r"CAST\(([^)]+) \+ '([^']+)' AS DATE\)", "CAST(strptime($1 + '$2', '%Y%m%d') AS DATE)"),
            (r"CAST\(CONCAT\(([^)]+)\) AS DATE\)", "CAST(strptime(CONCAT($1), '%Y%m%d') AS DATE)"),
            (r"TO_DATE\(([^,]+), 'yyyymmdd'\)", "CAST($1 AS DATE)"),
            
            // Date formatting
            (r"TO_CHAR\(([^,]+), 'YYYYMMDD'\)", "STRFTIME($1, '%Y%m%d')"),
            
            // Binary conversion
            (r"CAST\(CONCAT\('x', ([^)]+)\) AS BIT\(32\)\)", "CONVERT(VARBINARY, $1, 1)"),
            
            // Index creation patterns (remove CLUSTER commands)
            (r"CREATE INDEX ([^\s]+) ON ([^\s]+) \(([^)]+)\);\s*CLUSTER ([^\s]+) USING ([^;]+);", "CREATE INDEX $1 ON $2 ($3);"),
            (r"CREATE UNIQUE INDEX ([^\s]+) ON ([^\s]+) \(([^)]+)\);\s*CLUSTER ([^\s]+) USING ([^;]+);", "CREATE UNIQUE INDEX $1 ON $2 ($3);"),
            
            // Date arithmetic patterns
            (r"\(([^)]+) \+ ([^)]+)\*INTERVAL'1 day'\)", "($1 + TO_DAYS(CAST($2 AS INTEGER)))"),
            (r"\(([^)]+) \+ ([^)]+)\*INTERVAL'1 hour'\)", "($1 + TO_HOURS(CAST($2 AS INTEGER)))"),
            (r"\(([^)]+) \+ ([^)]+)\*INTERVAL'1 month'\)", "($1 + TO_MONTHS(CAST($2 AS INTEGER)))"),
            (r"\(([^)]+) \+ ([^)]+)\*INTERVAL'1 minute'\)", "($1 + TO_MINUTES(CAST($2 AS INTEGER)))"),
            (r"\(([^)]+) \+ ([^)]+)\*INTERVAL'1 second'\)", "($1 + TO_SECONDS(CAST($2 AS INTEGER)))"),
            (r"\(([^)]+) \+ ([^)]+)\*INTERVAL'1 year'\)", "($1 + TO_YEARS(CAST($2 AS INTEGER)))"),
            
            // Date difference calculations
            (r"\(CAST\(([^)]+) AS DATE\) - CAST\(([^)]+) AS DATE\)\)", "(CONVERT(DATE, $1) - CAST($2 AS DATE))"),
            (r"\(EXTRACT\(EPOCH FROM \(([^)]+) - ([^)]+)\)\) / 3600\)", "DATEDIFF(hour,$2, $1)"),
            (r"\(EXTRACT\(EPOCH FROM \(([^)]+) - ([^)]+)\)\) / 60\)", "DATEDIFF(minute,$2, $1)"),
            (r"EXTRACT\(EPOCH FROM \(([^)]+) - ([^)]+)\)\)", "DATEDIFF(second,$2, $1)"),
            
            // Date component extraction
            (r"EXTRACT\(DAY FROM ([^)]+)\)", "DAY(CAST($1 AS DATE))"),
            (r"EXTRACT\(MONTH FROM ([^)]+)\)", "MONTH(CAST($1 AS DATE))"),
            (r"EXTRACT\(YEAR FROM ([^)]+)\)", "YEAR(CAST($1 AS DATE))"),
            
            // Complex date construction
            (r"TO_DATE\(TO_CHAR\(([^,]+),'0000'\)\|\|'-'\|\|TO_CHAR\(([^,]+),'00'\)\|\|'-'\|\|TO_CHAR\(([^,]+),'00'\), 'YYYY-MM-DD'\)", "(CAST($1 AS VARCHAR) || '-' || CAST($2 AS VARCHAR) || '-' || CAST($3 AS VARCHAR)) :: DATE"),
            (r"TO_DATE\(TO_CHAR\(([^,]+),'0000'\)\|\|'-'\|\|TO_CHAR\(([^,]+),'00'\)\|\|'-'\|\|TO_CHAR\(([^,]+),'00'\)\|\|' '\|\|TO_CHAR\(([^,]+),'00'\)\|\|':'\|\|TO_CHAR\(([^,]+),'00'\)\|\|':'\|\|TO_CHAR\(([^,]+),'00'\), 'YYYY-MM-DD HH24:MI:SS'\)", "(CAST($1 AS VARCHAR) || '-' || CAST($2 AS VARCHAR) || '-' || CAST($3 AS VARCHAR) || '-' || CAST($4 AS VARCHAR) || '-' || CAST($5 AS VARCHAR) || '-' || CAST($6 AS VARCHAR)) :: DATE"),
            
            // Date truncation
            (r"\(DATE_TRUNC\('MONTH', ([^)]+)\) \+ INTERVAL '1 MONTH - 1 day'\)::DATE", "(DATE_TRUNC('MONTH', $1) + INTERVAL '1 MONTH' - INTERVAL '1 day')::DATE"),
            
            // Interval formatting
            (r"INTERVAL'(-?[0-9]+)\.0 ([^']+)'", "INTERVAL'$1 $2'"),
            
            // String functions
            (r"CHAR_LENGTH\(([^)]+)\)", "LENGTH($1)"),
            
            // Mathematical functions
            (r"<L_O_G>\(CAST\(\(([^)]+)\) AS NUMERIC\),CAST\(\(([^)]+)\) AS NUMERIC\)\)", "(LN(CAST(($2) AS REAL))/LN(CAST(($1) AS REAL)))"),
            (r"LOG\(10,CAST\(\(([^)]+)\) AS NUMERIC\)\)", "LOG($1)"),
            
            // Random/UUID functions
            (r"MD5\(RANDOM\(\)::TEXT \|\| CLOCK_TIMESTAMP\(\)::TEXT\)", "uuid()"),
            
            // Table operations
            (r"TRUNCATE TABLE ([^;]+);", "DELETE FROM $1;"),
        ];
        
        patterns.into_iter()
            .filter_map(|(pattern, replacement)| {
                Regex::new(pattern).ok().map(|regex| (regex, replacement.to_string()))
            })
            .collect()
    }
    
    /// Apply PostgreSQL to DuckDB transformations
    fn apply_postgres_to_duckdb_transformations(&self, sql: &str) -> String {
        let mut transformed_sql = sql.to_string();
        
        // Apply regex-based transformations
        for (regex, replacement) in &self.transformation_rules {
            transformed_sql = regex.replace_all(&transformed_sql, replacement.as_str()).to_string();
        }
        
        transformed_sql
    }
}

impl DialectTransformationEngine for DuckDbTransformationEngine {
    fn dialect(&self) -> Dialect {
        Dialect::DuckDb
    }

    fn transform_statement(&self, stmt: Statement) -> TransformationResult<Statement> {
        // For now, return statement as-is since we're doing post-processing transformations
        // In a more sophisticated implementation, we would parse and transform the AST
        Ok(stmt)
    }

    fn transform_statements(&self, statements: &[Statement]) -> TransformationResult<Vec<Statement>> {
        // For now, return statements as-is since we're doing post-processing transformations
        Ok(statements.to_vec())
    }

    fn apply_post_processing_rules(&self, sql: &str) -> TransformationResult<String> {
        // Apply PostgreSQL to DuckDB transformations during post-processing
        let transformed_sql = self.apply_postgres_to_duckdb_transformations(sql);
        Ok(transformed_sql)
    }

    fn validate_statement_for_hana(&self, _stmt: &Statement) -> TransformationResult<Vec<String>> {
        // DuckDB dialect performs no HANA-specific validation - returns empty validation issues
        Ok(vec![])
    }

    fn name(&self) -> &'static str {
        "DuckDB"
    }
}
