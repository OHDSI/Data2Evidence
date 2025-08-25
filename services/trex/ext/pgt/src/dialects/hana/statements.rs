use super::Transformer;
use crate::config::TransformationConfig;
use crate::error::TransformationResult;
use sqlparser::ast::{DataType, Expr, Query, SelectItem, SetExpr, Statement};

/// Transformer for PostgreSQL statements to HANA equivalents
pub struct StatementTransformer {
    config: TransformationConfig,
}

impl StatementTransformer {
    pub fn new(config: &TransformationConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }

    /// Transform LIMIT and OFFSET clauses
    fn transform_limit_offset(&self, query: &mut Query) -> TransformationResult<bool> {
        let mut changed = false;

        // In sqlparser 0.58, LIMIT and OFFSET are handled differently
        // The LIMIT clause has its own structure
        if query.limit_clause.is_some() {
            // Basic transformation - HANA supports LIMIT but syntax may vary
            changed = true;
        }

        Ok(changed)
    }
    /// Transform window functions and OVER clauses
    fn transform_window_functions(&self, query: &mut Query) -> TransformationResult<bool> {
        let mut changed = false;

        // Transform the main query body
        if let SetExpr::Select(ref mut select) = query.body.as_mut() {
            // Check for window functions in SELECT items
            for item in &mut select.projection {
                if let SelectItem::ExprWithAlias { expr, .. } = item {
                    if self.transform_window_function_expr(expr)? {
                        changed = true;
                    }
                } else if let SelectItem::UnnamedExpr(expr) = item {
                    if self.transform_window_function_expr(expr)? {
                        changed = true;
                    }
                }
            }
        }

        Ok(changed)
    }

    /// Transform window function expressions
    fn transform_window_function_expr(&self, expr: &mut Expr) -> TransformationResult<bool> {
        let mut changed = false;

        match expr {
            Expr::Function(func) => {
                if let Some(ref mut over) = func.over {
                    // Transform window specification if needed
                    // Most window functions are compatible, but some details might differ

                    // Check for PostgreSQL-specific window functions
                    let func_name = func.name.to_string().to_uppercase();
                    match func_name.as_str() {
                        "ROW_NUMBER" | "RANK" | "DENSE_RANK" | "NTILE" => {
                            // These are standard and supported in both
                        }
                        "LAG" | "LEAD" => {
                            // Supported in both, but validate argument syntax
                        }
                        "FIRST_VALUE" | "LAST_VALUE" => {
                            // Supported in both
                        }
                        _ => {
                            // Other window functions might need validation
                        }
                    }
                }
            }
            Expr::Nested(inner_expr) => {
                if self.transform_window_function_expr(inner_expr)? {
                    changed = true;
                }
            }
            _ => {}
        }

        Ok(changed)
    }

    /// Transform CREATE TABLE statements
    fn transform_create_table(&self, stmt: &mut Statement) -> TransformationResult<bool> {
        let mut changed = false;

        if let Statement::CreateTable(create_table) = stmt {
            // Handle CREATE TABLE AS SELECT syntax
            // HANA doesn't support CREATE TABLE ... AS SELECT directly
            // We need to split it into CREATE TABLE and INSERT INTO ... SELECT
            
            if let Some(query) = &create_table.query {
                // This is a CREATE TABLE AS SELECT statement
                // HANA doesn't support this syntax, so we need to transform it
                
                // For now, we'll just leave it as is and let the caller handle the split
                // The real transformation should be done at a higher level to generate multiple statements
                
                log::warn!("CREATE TABLE AS SELECT detected - may need manual transformation for HANA compatibility");
                // Don't change the statement here, but mark as changed to indicate processing
                changed = true;
            }

            // Transform table options for HANA
            // PostgreSQL might have table options that need to be adapted for HANA

            // Handle SERIAL columns (should be handled by DataTypeTransformer)
            for column in &mut create_table.columns {
                // Check for PostgreSQL-specific column options
                for option in &mut column.options {
                    match &mut option.option {
                        sqlparser::ast::ColumnOption::Default(expr) => {
                            // Handle default value expressions
                            if self.transform_default_expression(expr)? {
                                changed = true;
                            }
                        }
                        _ => {}
                    }
                }
            }

            // Transform constraints
            for constraint in &mut create_table.constraints {
                if self.transform_table_constraint(constraint)? {
                    changed = true;
                }
            }
        }

        Ok(changed)
    }

    /// Transform default value expressions
    fn transform_default_expression(&self, expr: &mut Expr) -> TransformationResult<bool> {
        let mut changed = false;

        match expr {
            Expr::Function(func) => {
                let func_name = func.name.to_string().to_lowercase();
                if func_name == "nextval" {
                    // nextval() calls should be transformed to IDENTITY columns
                    // This should be handled by the DataTypeTransformer
                    log::warn!("nextval() function found in default expression - should be converted to IDENTITY");
                } else {
                    // Transform other functions using the function transformer logic
                    // For now, handle common functions directly
                    let func_name_upper = func.name.to_string().to_uppercase();
                    match func_name_upper.as_str() {
                        "NOW" => {
                            // Transform NOW() to CURRENT_TIMESTAMP in DEFAULT clauses only
                            // (HANA supports NOW() in SELECT but not in DEFAULT)
                            func.name = sqlparser::ast::ObjectName(vec![
                                sqlparser::ast::ObjectNamePart::Identifier(
                                    sqlparser::ast::Ident::new("CURRENT_TIMESTAMP"),
                                ),
                            ]);
                            // Clear the arguments to make it CURRENT_TIMESTAMP instead of CURRENT_TIMESTAMP()
                            func.args = sqlparser::ast::FunctionArguments::None;
                            changed = true;
                        }
                        "RANDOM" => {
                            // Transform RANDOM() to RAND()
                            func.name = sqlparser::ast::ObjectName(vec![
                                sqlparser::ast::ObjectNamePart::Identifier(
                                    sqlparser::ast::Ident::new("RAND"),
                                ),
                            ]);
                            changed = true;
                        }
                        _ => {
                            // Other functions - could be extended
                        }
                    }
                }
            }
            Expr::Nested(inner_expr) => {
                if self.transform_default_expression(inner_expr)? {
                    changed = true;
                }
            }
            _ => {}
        }

        Ok(changed)
    }

    /// Transform data types (delegate to DataTypeTransformer)
    fn transform_data_type(&self, _data_type: &mut DataType) -> TransformationResult<bool> {
        // This should be handled by the DataTypeTransformer
        Ok(false)
    }

    /// Transform table constraints
    fn transform_table_constraint(
        &self,
        constraint: &mut sqlparser::ast::TableConstraint,
    ) -> TransformationResult<bool> {
        match constraint {
            sqlparser::ast::TableConstraint::Check { .. } => {
                // Transform CHECK constraint expressions
                // Most CHECK constraints should be compatible
                Ok(false)
            }
            sqlparser::ast::TableConstraint::ForeignKey { .. } => {
                // Foreign key constraints are generally compatible
                Ok(false)
            }
            sqlparser::ast::TableConstraint::Unique { .. } => {
                // Unique constraints are compatible
                Ok(false)
            }
            sqlparser::ast::TableConstraint::PrimaryKey { .. } => {
                // Primary key constraints are compatible
                Ok(false)
            }
            _ => Ok(false),
        }
    }

    /// Transform INSERT statements
    fn transform_insert(&self, stmt: &mut Statement) -> TransformationResult<bool> {
        let mut changed = false;

        if let Statement::Insert(insert) = stmt {
            // Handle INSERT ... ON CONFLICT (PostgreSQL) -> UPSERT (HANA)
            if insert.on.is_some() {
                log::warn!("ON CONFLICT clause requires manual conversion to HANA UPSERT syntax");
            }

            // Handle RETURNING clause
            if let Some(ref returning) = insert.returning {
                if !returning.is_empty() {
                    log::warn!(
                        "RETURNING clause is not supported in HANA - consider using OUTPUT clause"
                    );
                }
            }

            // Transform the source query if present
            if let Some(ref mut source_query) = insert.source {
                if self.transform_limit_offset(source_query)? {
                    changed = true;
                }
            }
        }

        Ok(changed)
    }

    /// Transform UPDATE statements
    fn transform_update(&self, stmt: &mut Statement) -> TransformationResult<bool> {
        let changed = false;

        if let Statement::Update {
            from, returning, ..
        } = stmt
        {
            // Handle UPDATE ... FROM (PostgreSQL specific)
            if let Some(ref from_clause) = from {
                log::warn!("UPDATE ... FROM syntax may need adjustment for HANA compatibility");
            }

            // Handle RETURNING clause
            if let Some(ref returning) = returning {
                if !returning.is_empty() {
                    log::warn!("RETURNING clause in UPDATE is not supported in HANA");
                }
            }
        }

        Ok(changed)
    }

    /// Transform DELETE statements
    fn transform_delete(&self, stmt: &mut Statement) -> TransformationResult<bool> {
        let changed = false;

        if let Statement::Delete(delete) = stmt {
            // Handle DELETE ... USING (PostgreSQL specific)
            if let Some(ref using) = delete.using {
                if !using.is_empty() {
                    log::warn!(
                        "DELETE ... USING syntax may need adjustment for HANA compatibility"
                    );
                }
            }

            // Handle RETURNING clause
            if let Some(ref returning) = delete.returning {
                if !returning.is_empty() {
                    log::warn!("RETURNING clause in DELETE is not supported in HANA");
                }
            }
        }

        Ok(changed)
    }
}

impl Transformer for StatementTransformer {
    fn name(&self) -> &'static str {
        "StatementTransformer"
    }

    fn priority(&self) -> u8 {
        50 // Execute after other transformers
    }

    fn supports_statement_type(&self, stmt: &Statement) -> bool {
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
                if self.transform_limit_offset(query)? {
                    changed = true;
                }
                if self.transform_window_functions(query)? {
                    changed = true;
                }
            }
            Statement::CreateTable(_) => {
                if self.transform_create_table(stmt)? {
                    changed = true;
                }
            }
            Statement::Insert(_) => {
                if self.transform_insert(stmt)? {
                    changed = true;
                }
            }
            Statement::Update { .. } => {
                if self.transform_update(stmt)? {
                    changed = true;
                }
            }
            Statement::Delete(_) => {
                if self.transform_delete(stmt)? {
                    changed = true;
                }
            }
            _ => {}
        }

        Ok(changed)
    }
}
