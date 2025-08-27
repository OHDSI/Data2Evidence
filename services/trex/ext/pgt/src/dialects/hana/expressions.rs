use super::Transformer;
use crate::config::TransformationConfig;
use crate::error::TransformationResult;
use sqlparser::ast::{
    BinaryOperator, CastKind, Delete, Expr, Function, Ident, Statement, UnaryOperator,
};

/// Transformer for PostgreSQL expressions to HANA equivalents
pub struct ExpressionTransformer {
    config: TransformationConfig,
}

impl ExpressionTransformer {
    pub fn new(config: &TransformationConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }

    /// Transform expressions recursively
    fn transform_expression(&self, expr: &mut Expr) -> TransformationResult<bool> {
        let mut changed = false;

        match expr {
            Expr::BinaryOp { left, op, right } => {
                // Transform left and right operands
                if self.transform_expression(left)? {
                    changed = true;
                }
                if self.transform_expression(right)? {
                    changed = true;
                }

                // Transform the operator if needed
                if self.transform_binary_operator(op)? {
                    changed = true;
                }
            }
            Expr::UnaryOp {
                op,
                expr: inner_expr,
            } => {
                if self.transform_expression(inner_expr)? {
                    changed = true;
                }

                if self.transform_unary_operator(op)? {
                    changed = true;
                }
            }
            Expr::Nested(inner_expr) => {
                if self.transform_expression(inner_expr)? {
                    changed = true;
                }
            }
            Expr::Cast {
                expr: inner_expr,
                data_type,
                kind,
                ..
            } => {
                log::debug!("🎯 Found Cast expression with kind: {:?}", kind);

                // Transform PostgreSQL :: casts to HANA CAST() syntax
                if matches!(kind, CastKind::DoubleColon) {
                    log::debug!("🔄 Transforming DoubleColon cast to CAST() syntax");
                    *kind = CastKind::Cast;
                    changed = true;
                }

                if self.transform_expression(inner_expr)? {
                    changed = true;
                }

                // Transform the cast data type if needed
                // Create a temporary data type transformer to handle the type transformation
                let data_type_transformer =
                    crate::dialects::hana::data_types::DataTypeTransformer::new(&self.config);
                if data_type_transformer.transform_data_type(data_type)? {
                    changed = true;
                }
            }
            Expr::IsNull(inner_expr) | Expr::IsNotNull(inner_expr) => {
                if self.transform_expression(inner_expr)? {
                    changed = true;
                }
            }
            Expr::Case {
                operand,
                else_result,
                ..
            } => {
                // Transform CASE expressions
                if let Some(operand) = operand {
                    if self.transform_expression(operand)? {
                        changed = true;
                    }
                }

                // TODO: Fix CaseWhen structure
                // for condition in conditions {
                //     if self.transform_expression(condition)? {
                //         changed = true;
                //     }
                // }

                // for result in results {
                //     if self.transform_expression(result)? {
                //         changed = true;
                //     }
                // }

                if let Some(else_result) = else_result {
                    if self.transform_expression(else_result)? {
                        changed = true;
                    }
                }
            }
            Expr::InList {
                expr: inner_expr,
                list,
                negated,
            } => {
                if self.transform_expression(inner_expr)? {
                    changed = true;
                }

                for item in list {
                    if self.transform_expression(item)? {
                        changed = true;
                    }
                }
            }
            Expr::Between {
                expr: inner_expr,
                negated,
                low,
                high,
            } => {
                if self.transform_expression(inner_expr)? {
                    changed = true;
                }
                if self.transform_expression(low)? {
                    changed = true;
                }
                if self.transform_expression(high)? {
                    changed = true;
                }
            }
            Expr::Like {
                expr: inner_expr,
                pattern,
                negated,
                escape_char,
                ..
            } => {
                if self.transform_expression(inner_expr)? {
                    changed = true;
                }
                if self.transform_expression(pattern)? {
                    changed = true;
                }

                // LIKE is supported in both PostgreSQL and HANA
                // But ILIKE (case-insensitive) might need transformation
            }
            Expr::ILike {
                expr: _inner_expr,
                pattern: _,
                negated: _,
                escape_char: _,
                ..
            } => {
                // PostgreSQL ILIKE -> HANA case-insensitive comparison
                // Transform ILIKE to UPPER(expr) LIKE UPPER(pattern)
                // TODO: Implement when Function API is fixed
                // if self.transform_ilike_to_like(expr)? {
                //     changed = true;
                // }
            }
            Expr::Subquery(query) => {
                // Transform expressions in subqueries
                if self.transform_query_expressions(&mut query.body)? {
                    changed = true;
                }
            }
            Expr::Exists { subquery, negated } => {
                if self.transform_query_expressions(&mut subquery.body)? {
                    changed = true;
                }
            }
            Expr::TypedString {
                data_type, value, ..
            } => {
                log::debug!(
                    "🎯 Found TypedString expression: {:?}::{:?}",
                    value,
                    data_type
                );
                // Transform PostgreSQL ::TYPE casts to HANA CAST() syntax
                if self.transform_typed_string_to_cast(expr)? {
                    changed = true;
                }
            }
            Expr::Function(function) => {
                // Handle function expressions like nextval(), currval(), etc.
                let function_name = function.name.to_string().to_uppercase();

                match function_name.as_str() {
                    "NEXTVAL" => {
                        if let Some(new_expr) = self.build_hana_nextval_expr(function)? {
                            *expr = new_expr;
                            changed = true;
                        }
                    }
                    "CURRVAL" => {
                        if let Some(new_expr) = self.build_hana_currval_expr(function)? {
                            *expr = new_expr;
                            changed = true;
                        }
                    }
                    _ => {
                        // For other functions, just process their arguments
                        if let sqlparser::ast::FunctionArguments::List(ref mut arg_list) =
                            function.args
                        {
                            for arg in &mut arg_list.args {
                                if let sqlparser::ast::FunctionArg::Unnamed(
                                    sqlparser::ast::FunctionArgExpr::Expr(ref mut arg_expr),
                                ) = arg
                                {
                                    if self.transform_expression(arg_expr)? {
                                        changed = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            _ => {
                // Handle other expression types as needed
            }
        }

        Ok(changed)
    }

    /// Transform binary operators
    fn transform_binary_operator(&self, op: &mut BinaryOperator) -> TransformationResult<bool> {
        match op {
            BinaryOperator::StringConcat => {
                // PostgreSQL || is supported in HANA, no change needed
                Ok(false)
            }
            BinaryOperator::PGRegexMatch => {
                // PostgreSQL ~ operator (regex match) - not directly supported in HANA
                // Would need to transform to HANA regex functions
                log::warn!("PostgreSQL regex match operator (~) requires manual conversion");
                Ok(false)
            }
            BinaryOperator::PGRegexIMatch => {
                // PostgreSQL ~* operator (case-insensitive regex match)
                log::warn!("PostgreSQL case-insensitive regex match operator (~*) requires manual conversion");
                Ok(false)
            }
            BinaryOperator::PGRegexNotMatch => {
                // PostgreSQL !~ operator
                log::warn!("PostgreSQL regex not match operator (!~) requires manual conversion");
                Ok(false)
            }
            BinaryOperator::PGRegexNotIMatch => {
                // PostgreSQL !~* operator
                log::warn!("PostgreSQL case-insensitive regex not match operator (!~*) requires manual conversion");
                Ok(false)
            }
            _ => {
                // Most other operators are compatible
                Ok(false)
            }
        }
    }

    /// Transform unary operators
    fn transform_unary_operator(&self, op: &mut UnaryOperator) -> TransformationResult<bool> {
        match op {
            UnaryOperator::Not | UnaryOperator::Plus | UnaryOperator::Minus => {
                // These are standard and supported in both
                Ok(false)
            }
            _ => Ok(false),
        }
    }

    /// Transform ILIKE to case-insensitive LIKE
    fn transform_ilike_to_like(&self, expr: &mut Expr) -> TransformationResult<bool> {
        // TODO: Function API is complex - comment out for now
        // This would transform ILIKE to UPPER(expr) LIKE UPPER(pattern)
        // but the Function structure requires args and within_group fields
        Ok(false)
    }

    /// Transform expressions in query statements
    fn transform_query_expressions(
        &self,
        query: &mut sqlparser::ast::SetExpr,
    ) -> TransformationResult<bool> {
        let mut changed = false;

        match query {
            sqlparser::ast::SetExpr::Select(select) => {
                // Transform expressions in SELECT items
                for item in &mut select.projection {
                    match item {
                        sqlparser::ast::SelectItem::UnnamedExpr(expr) => {
                            if self.transform_expression(expr)? {
                                changed = true;
                            }
                        }
                        sqlparser::ast::SelectItem::ExprWithAlias { expr, .. } => {
                            if self.transform_expression(expr)? {
                                changed = true;
                            }
                        }
                        _ => {}
                    }
                }

                // Transform WHERE clause
                if let Some(ref mut selection) = select.selection {
                    if self.transform_expression(selection)? {
                        changed = true;
                    }
                }

                // Transform GROUP BY expressions
                // TODO: Fix GroupByExpr API - needs second parameter
                // for group_expr in &mut select.group_by {
                //     if let sqlparser::ast::GroupByExpr::Expressions(expressions, _) = group_expr {
                //         for expr in expressions {
                //             if self.transform_expression(expr)? {
                //                 changed = true;
                //             }
                //         }
                //     }
                // }

                // Transform HAVING clause
                if let Some(ref mut having) = select.having {
                    if self.transform_expression(having)? {
                        changed = true;
                    }
                }

                // Transform ORDER BY expressions - TODO: Check if order_by exists on Select
                // for order_by in &mut select.order_by {
                //     if self.transform_expression(&mut order_by.expr)? {
                //         changed = true;
                //     }
                // }
            }
            sqlparser::ast::SetExpr::SetOperation { left, right, .. } => {
                if self.transform_query_expressions(left)? {
                    changed = true;
                }
                if self.transform_query_expressions(right)? {
                    changed = true;
                }
            }
            sqlparser::ast::SetExpr::Values(values) => {
                log::debug!("🎯 Found VALUES clause with {} rows", values.rows.len());
                // Transform expressions in VALUES clauses
                for row in &mut values.rows {
                    log::debug!("🔍 Transforming row with {} expressions", row.len());
                    for expr in row {
                        if self.transform_expression(expr)? {
                            changed = true;
                        }
                    }
                }
            }
            _ => {}
        }

        Ok(changed)
    }

    /// Transform PostgreSQL ::TYPE syntax to HANA CAST() syntax
    fn transform_typed_string_to_cast(&self, expr: &mut Expr) -> TransformationResult<bool> {
        if let Expr::TypedString { data_type, value } = expr {
            log::debug!(
                "🔄 Transforming TypedString to Cast: {:?}::{:?}",
                value,
                data_type
            );

            // Convert PostgreSQL 'value'::TYPE to HANA CAST('value' AS TYPE)
            let cast_expr = Expr::Cast {
                kind: CastKind::Cast,
                expr: Box::new(Expr::Value(value.clone())),
                data_type: data_type.clone(),
                format: None,
            };

            *expr = cast_expr;
            log::debug!("✅ Successfully transformed TypedString to Cast");
            return Ok(true);
        }

        Ok(false)
    }

    /// Transform expressions in statements
    fn transform_statement(&self, stmt: &mut Statement) -> TransformationResult<bool> {
        let mut changed = false;

        match stmt {
            Statement::Query(query) => {
                if self.transform_query_expressions(&mut query.body)? {
                    changed = true;
                }
            }
            Statement::Insert(insert_stmt) => {
                log::debug!("🔍 INSERT statement structure: {:#?}", insert_stmt);

                if let Some(ref mut source) = insert_stmt.source {
                    log::debug!("🔍 INSERT has source query, transforming...");
                    if self.transform_query_expressions(&mut source.body)? {
                        changed = true;
                    }
                } else {
                    log::debug!("🔍 INSERT has no source query, checking for VALUES...");
                }
            }
            Statement::Update {
                assignments,
                selection,
                ..
            } => {
                // Transform assignment expressions
                for assignment in assignments {
                    if self.transform_expression(&mut assignment.value)? {
                        changed = true;
                    }
                }

                // Transform WHERE clause
                if let Some(ref mut where_clause) = selection {
                    if self.transform_expression(where_clause)? {
                        changed = true;
                    }
                }
            }
            Statement::Delete(Delete { selection, .. }) => {
                if let Some(ref mut where_clause) = selection {
                    if self.transform_expression(where_clause)? {
                        changed = true;
                    }
                }
            }
            Statement::CreateView { query, .. } => {
                if self.transform_query_expressions(&mut query.body)? {
                    changed = true;
                }
            }
            _ => {}
        }

        Ok(changed)
    }

    /// Build HANA sequence.NEXTVAL expression from PostgreSQL nextval('sequence_name')
    fn build_hana_nextval_expr(&self, function: &Function) -> TransformationResult<Option<Expr>> {
        if let sqlparser::ast::FunctionArguments::List(ref arg_list) = function.args {
            if arg_list.args.len() == 1 {
                if let sqlparser::ast::FunctionArg::Unnamed(
                    sqlparser::ast::FunctionArgExpr::Expr(Expr::Value(
                        sqlparser::ast::ValueWithSpan {
                            value: sqlparser::ast::Value::SingleQuotedString(ref seq_name),
                            span: _,
                        },
                    )),
                ) = &arg_list.args[0]
                {
                    // Transform to sequence_name.NEXTVAL using CompoundIdentifier
                    let new_expr =
                        Expr::CompoundIdentifier(vec![Ident::new(seq_name), Ident::new("NEXTVAL")]);
                    return Ok(Some(new_expr));
                }
            }
        }
        Ok(None)
    }

    /// Build HANA sequence.CURRVAL expression from PostgreSQL currval('sequence_name')
    fn build_hana_currval_expr(&self, function: &Function) -> TransformationResult<Option<Expr>> {
        if let sqlparser::ast::FunctionArguments::List(ref arg_list) = function.args {
            if arg_list.args.len() == 1 {
                if let sqlparser::ast::FunctionArg::Unnamed(
                    sqlparser::ast::FunctionArgExpr::Expr(Expr::Value(
                        sqlparser::ast::ValueWithSpan {
                            value: sqlparser::ast::Value::SingleQuotedString(ref seq_name),
                            span: _,
                        },
                    )),
                ) = &arg_list.args[0]
                {
                    // Transform to sequence_name.CURRVAL using CompoundIdentifier
                    let new_expr =
                        Expr::CompoundIdentifier(vec![Ident::new(seq_name), Ident::new("CURRVAL")]);
                    return Ok(Some(new_expr));
                }
            }
        }
        Ok(None)
    }
}

impl Transformer for ExpressionTransformer {
    fn name(&self) -> &'static str {
        "ExpressionTransformer"
    }

    fn priority(&self) -> u8 {
        40 // Execute after data types and functions
    }

    fn supports_statement_type(&self, stmt: &Statement) -> bool {
        // Expressions can appear in most statement types
        matches!(
            stmt,
            Statement::Query(_)
                | Statement::Insert { .. }
                | Statement::Update { .. }
                | Statement::Delete { .. }
                | Statement::CreateView { .. }
                | Statement::CreateTable { .. }
        )
    }

    fn transform(&self, stmt: &mut Statement) -> TransformationResult<bool> {
        self.transform_statement(stmt)
    }
}
