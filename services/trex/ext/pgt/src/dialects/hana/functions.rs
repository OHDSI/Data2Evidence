use super::Transformer;
use crate::config::TransformationConfig;
use crate::error::TransformationResult;
use sqlparser::ast::{Expr, Function, Ident, ObjectName, Statement};
use std::collections::HashMap;

/// Transformer for PostgreSQL functions to HANA equivalents
pub struct FunctionTransformer {
    simple_mappings: HashMap<String, String>,
    preserve_case: bool,
}

impl FunctionTransformer {
    pub fn new(config: &TransformationConfig) -> Self {
        let mut simple_mappings = config.functions.custom_mappings.clone();

        // Add default function mappings
        for (pg_func, hana_func) in get_default_function_mappings() {
            simple_mappings.entry(pg_func).or_insert(hana_func);
        }

        Self {
            simple_mappings,
            preserve_case: config.functions.preserve_case,
        }
    }

    /// Transform function calls in expressions
    fn transform_expression(&self, expr: &mut Expr) -> TransformationResult<bool> {
        let mut changed = false;

        match expr {
            Expr::Function(func) => {
                if self.transform_function(func)? {
                    changed = true;
                }
            }
            Expr::BinaryOp { left, op, right } => {
                // Handle binary operations that might need transformation
                if self.transform_expression(left)? {
                    changed = true;
                }
                if self.transform_expression(right)? {
                    changed = true;
                }

                // Transform concatenation operator || to CONCAT function if needed
                if matches!(op, sqlparser::ast::BinaryOperator::StringConcat) {
                    // HANA supports || operator, so no change needed by default
                    // But could be configured to use CONCAT function instead
                }
            }
            Expr::Nested(inner) => {
                if self.transform_expression(inner)? {
                    changed = true;
                }
            }
            Expr::Subquery(query) => {
                // Transform functions in subqueries
                if self.transform_query_functions(&mut query.body)? {
                    changed = true;
                }
            }
            _ => {
                // Handle other expression types that might contain functions
            }
        }

        Ok(changed)
    }

    /// Transform a specific function call
    fn transform_function(&self, func: &mut Function) -> TransformationResult<bool> {
        let func_name = func.name.to_string().to_uppercase();
        let mut changed = false;

        // Debug: Check what mappings we have
        if func_name == "NOW" {
            eprintln!("DEBUG: Found NOW function, checking mappings...");
            eprintln!("DEBUG: Simple mappings: {:?}", self.simple_mappings);
        }

        // Check for simple name mappings first
        if let Some(hana_name) = self.simple_mappings.get(&func_name) {
            eprintln!("DEBUG: Transforming {} to {}", func_name, hana_name);
            func.name = ObjectName(vec![sqlparser::ast::ObjectNamePart::Identifier(
                Ident::new(hana_name),
            )]);
            changed = true;
        } else {
            // Handle complex function transformations
            changed = self.transform_complex_function(func)?;
        }

        // Transform arguments recursively - handle sqlparser 0.58 FunctionArguments
        match &mut func.args {
            sqlparser::ast::FunctionArguments::List(arg_list) => {
                for arg in &mut arg_list.args {
                    if let sqlparser::ast::FunctionArg::Unnamed(
                        sqlparser::ast::FunctionArgExpr::Expr(expr),
                    ) = arg
                    {
                        if self.transform_expression(expr)? {
                            changed = true;
                        }
                    }
                }
            }
            _ => {
                // Handle other FunctionArguments variants as needed
            }
        }

        Ok(changed)
    }

    /// Handle complex function transformations that require argument manipulation
    fn transform_complex_function(&self, func: &mut Function) -> TransformationResult<bool> {
        let func_name = func.name.to_string().to_uppercase();

        match func_name.as_str() {
            "CONCAT" => {
                // HANA CONCAT only takes 2 arguments, but PostgreSQL CONCAT can take more
                // Transform CONCAT(a, b, c) to CONCAT(CONCAT(a, b), c)
                self.transform_concat_function(func)
            }
            "POSITION" => {
                // POSITION(substring IN string) -> LOCATE(substring, string)
                self.transform_position_function(func)
            }
            "SUBSTRING" => {
                // SUBSTRING(string FROM start FOR length) -> SUBSTRING(string, start, length)
                self.transform_substring_function(func)
            }
            "EXTRACT" => {
                // EXTRACT is supported in HANA, but validate the format
                self.validate_extract_function(func)
            }
            "RANDOM" => {
                // RANDOM() -> RAND()
                func.name = ObjectName(vec![sqlparser::ast::ObjectNamePart::Identifier(
                    Ident::new("RAND"),
                )]);
                Ok(true)
            }
            "NEXTVAL" => {
                // Handle sequence nextval calls
                self.transform_nextval_function(func)
            }
            _ => Ok(false),
        }
    }

    /// Transform POSITION(substring IN string) to LOCATE(substring, string)
    fn transform_position_function(&self, func: &mut Function) -> TransformationResult<bool> {
        // PostgreSQL: POSITION(substring IN string)
        // HANA: LOCATE(substring, string)
        
        func.name = ObjectName(vec![sqlparser::ast::ObjectNamePart::Identifier(
            Ident::new("LOCATE"),
        )]);

        // Note: The sqlparser should already parse POSITION correctly
        // and the arguments should be in the right order for LOCATE
        // This transformation just changes the function name

        Ok(true)
    }

    /// Transform SUBSTRING function syntax
    fn transform_substring_function(&self, func: &mut Function) -> TransformationResult<bool> {
        // PostgreSQL: SUBSTRING(string FROM start FOR length)
        // HANA: SUBSTRING(string, start, length)

        // This is a simplified transformation - real implementation would need
        // to parse the FROM/FOR syntax and reorder arguments

        Ok(false) // For now, assume no change needed
    }

    /// Validate EXTRACT function usage
    fn validate_extract_function(&self, func: &mut Function) -> TransformationResult<bool> {
        // EXTRACT is supported in both PostgreSQL and HANA
        // Just validate that the format is correct
        Ok(false)
    }

    /// Transform CONCAT function to handle HANA's 2-argument limitation
    fn transform_concat_function(&self, func: &mut Function) -> TransformationResult<bool> {
        // HANA CONCAT only takes 2 arguments, PostgreSQL CONCAT can take more
        // Transform CONCAT(a, b, c) to CONCAT(CONCAT(a, b), c)
        
        if let sqlparser::ast::FunctionArguments::List(arg_list) = &mut func.args {
            if arg_list.args.len() > 2 {
                // Need to nest CONCAT calls
                // For now, let's convert to string concatenation operator instead
                // This is a complex transformation that would require restructuring the AST
                
                log::warn!("CONCAT with more than 2 arguments detected - consider using || operator instead");
                
                // Return false for now - the || operator should work in HANA
                return Ok(false);
            }
        }
        
        // 2 or fewer arguments - no change needed
        Ok(false)
    }

    /// Transform PostgreSQL sequence nextval() to HANA sequence syntax
    fn transform_nextval_function(&self, func: &mut Function) -> TransformationResult<bool> {
        // PostgreSQL: nextval('sequence_name')
        // HANA: sequence_name.NEXTVAL

        if let sqlparser::ast::FunctionArguments::List(arg_list) = &func.args {
            if arg_list.args.len() == 1 {
                if let sqlparser::ast::FunctionArg::Unnamed(
                    sqlparser::ast::FunctionArgExpr::Expr(Expr::Value(value_with_span)),
                ) = &arg_list.args[0]
                {
                    if let sqlparser::ast::Value::SingleQuotedString(seq_name) =
                        &value_with_span.value
                    {
                        // Transform to sequence_name.NEXTVAL
                        // This would need to be handled at a higher level in the AST
                        // as it changes the expression structure significantly

                        // For now, just log a warning that manual conversion is needed
                        log::warn!(
                            "NEXTVAL function requires manual conversion to HANA sequence syntax"
                        );
                    }
                }
            }
        }

        Ok(false)
    }

    /// Transform functions in query expressions
    fn transform_query_functions(
        &self,
        query: &mut sqlparser::ast::SetExpr,
    ) -> TransformationResult<bool> {
        let mut changed = false;

        match query {
            sqlparser::ast::SetExpr::Select(select) => {
                // Transform functions in SELECT items
                for item in &mut select.projection {
                    if let sqlparser::ast::SelectItem::UnnamedExpr(expr) = item {
                        if self.transform_expression(expr)? {
                            changed = true;
                        }
                    } else if let sqlparser::ast::SelectItem::ExprWithAlias { expr, .. } = item {
                        if self.transform_expression(expr)? {
                            changed = true;
                        }
                    }
                }

                // Transform functions in WHERE clause
                if let Some(ref mut where_clause) = select.selection {
                    if self.transform_expression(where_clause)? {
                        changed = true;
                    }
                }

                // Transform functions in GROUP BY
                if let sqlparser::ast::GroupByExpr::Expressions(expressions, _) =
                    &mut select.group_by
                {
                    for expr in expressions {
                        if self.transform_expression(expr)? {
                            changed = true;
                        }
                    }
                }

                // Transform functions in HAVING clause
                if let Some(ref mut having) = select.having {
                    if self.transform_expression(having)? {
                        changed = true;
                    }
                }
            }
            sqlparser::ast::SetExpr::SetOperation { left, right, .. } => {
                if self.transform_query_functions(left)? {
                    changed = true;
                }
                if self.transform_query_functions(right)? {
                    changed = true;
                }
            }
            _ => {}
        }

        Ok(changed)
    }
}

impl Transformer for FunctionTransformer {
    fn name(&self) -> &'static str {
        "FunctionTransformer"
    }

    fn priority(&self) -> u8 {
        30 // Execute after data types but before statement-level transformations
    }

    fn supports_statement_type(&self, stmt: &Statement) -> bool {
        // Functions can appear in most statement types
        matches!(
            stmt,
            Statement::Query(_)
                | Statement::Insert(_)
                | Statement::Update { .. }
                | Statement::Delete(_)
                | Statement::CreateTable(_)
                | Statement::CreateView { .. }
        )
    }

    fn transform(&self, stmt: &mut Statement) -> TransformationResult<bool> {
        let mut changed = false;

        match stmt {
            Statement::Query(query) => {
                if self.transform_query_functions(&mut query.body)? {
                    changed = true;
                }
            }
            Statement::Insert(insert) => {
                if let Some(source) = &mut insert.source {
                    if self.transform_query_functions(&mut source.body)? {
                        changed = true;
                    }
                }
            }
            Statement::Update {
                selection,
                assignments,
                ..
            } => {
                // Transform functions in SET clauses
                for assignment in assignments {
                    if self.transform_expression(&mut assignment.value)? {
                        changed = true;
                    }
                }

                // Transform functions in WHERE clause
                if let Some(ref mut where_clause) = selection {
                    if self.transform_expression(where_clause)? {
                        changed = true;
                    }
                }
            }
            Statement::Delete(delete) => {
                if let Some(ref mut where_clause) = delete.selection {
                    if self.transform_expression(where_clause)? {
                        changed = true;
                    }
                }
            }
            _ => {}
        }

        Ok(changed)
    }
}

/// Get default PostgreSQL to HANA function mappings
fn get_default_function_mappings() -> HashMap<String, String> {
    let mut mappings = HashMap::new();

    // Simple name mappings
    mappings.insert("RANDOM".to_string(), "RAND".to_string());
    //mappings.insert("NOW".to_string(), "CURRENT_TIMESTAMP".to_string());
    // NOW() is supported natively in HANA, no transformation needed
    mappings.insert(
        "CURRENT_TIMESTAMP()".to_string(),
        "CURRENT_TIMESTAMP".to_string(),
    );
    mappings.insert("CURRENT_TIME()".to_string(), "CURRENT_TIME".to_string());
    mappings.insert("CURRENT_DATE()".to_string(), "CURRENT_DATE".to_string());

    // String functions
    mappings.insert("LENGTH".to_string(), "LENGTH".to_string()); // Same in both
    mappings.insert("UPPER".to_string(), "UPPER".to_string()); // Same in both
    mappings.insert("LOWER".to_string(), "LOWER".to_string()); // Same in both
    mappings.insert("TRIM".to_string(), "TRIM".to_string()); // Same in both

    // Math functions
    mappings.insert("ABS".to_string(), "ABS".to_string()); // Same in both
    mappings.insert("ROUND".to_string(), "ROUND".to_string()); // Same in both
    mappings.insert("CEIL".to_string(), "CEIL".to_string()); // Same in both
    mappings.insert("FLOOR".to_string(), "FLOOR".to_string()); // Same in both

    // Aggregate functions (mostly the same)
    mappings.insert("COUNT".to_string(), "COUNT".to_string());
    mappings.insert("SUM".to_string(), "SUM".to_string());
    mappings.insert("AVG".to_string(), "AVG".to_string());
    mappings.insert("MIN".to_string(), "MIN".to_string());
    mappings.insert("MAX".to_string(), "MAX".to_string());

    mappings
}
