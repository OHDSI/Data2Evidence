use super::Transformer;
use crate::config::TransformationConfig;
use crate::error::TransformationResult;
use sqlparser::ast::{ColumnDef, DataType, Statement};
use std::collections::HashMap;

/// Transformer for PostgreSQL data types to HANA data types
pub struct DataTypeTransformer {
    mappings: HashMap<String, String>,
    preserve_precision: bool,
}

impl DataTypeTransformer {
    pub fn new(config: &TransformationConfig) -> Self {
        let mut mappings = config.data_types.custom_mappings.clone();

        // Add default mappings if not overridden
        for (pg_type, hana_type) in get_default_mappings() {
            mappings.entry(pg_type).or_insert(hana_type);
        }

        Self {
            mappings,
            preserve_precision: config.data_types.preserve_precision,
        }
    }

    /// Transform a PostgreSQL data type to HANA equivalent
    pub fn transform_data_type(&self, data_type: &mut DataType) -> TransformationResult<bool> {
        let mut changed = false;

        match data_type {
            DataType::Custom(object_name, type_values) => {
                let type_name = object_name.to_string().to_uppercase();

                if let Some(hana_type) = self.mappings.get(&type_name) {
                    // Parse the HANA type string and replace
                    if let Ok(new_type) = parse_hana_type(hana_type) {
                        *data_type = new_type;
                        changed = true;
                    }
                }
            }
            DataType::Varchar(length) => {
                // PostgreSQL VARCHAR -> HANA NVARCHAR
                *data_type = DataType::Nvarchar(length.clone());
                changed = true;
            }
            DataType::Char(length) => {
                // PostgreSQL CHAR -> HANA NVARCHAR
                *data_type = DataType::Nvarchar(length.clone());
                changed = true;
            }
            DataType::Text => {
                // PostgreSQL TEXT -> HANA NCLOB
                *data_type = DataType::Clob(None);
                changed = true;
            }
            DataType::JSON => {
                // PostgreSQL JSON -> HANA NCLOB
                *data_type = DataType::Clob(None);
                changed = true;
            }
            DataType::Boolean => {
                // Boolean is supported in both, no change needed
            }
            DataType::Integer(display) => {
                // Check for SERIAL type (handled separately)
                // INTEGER remains INTEGER
            }
            DataType::BigInt(display) => {
                // BIGINT remains BIGINT
            }
            DataType::Timestamp(precision, timezone) => {
                if *timezone == sqlparser::ast::TimezoneInfo::WithTimeZone {
                    // PostgreSQL TIMESTAMPTZ -> HANA TIMESTAMP (remove timezone)
                    *data_type =
                        DataType::Timestamp(precision.clone(), sqlparser::ast::TimezoneInfo::None);
                    changed = true;
                }
            }
            DataType::Array(element_type) => {
                // PostgreSQL arrays are not directly supported in HANA
                // Convert to NCLOB for JSON representation
                *data_type = DataType::Clob(None);
                changed = true;
            }
            _ => {
                // Other types may not need transformation
            }
        }

        Ok(changed)
    }
}

impl Transformer for DataTypeTransformer {
    fn name(&self) -> &'static str {
        "DataTypeTransformer"
    }

    fn priority(&self) -> u8 {
        10 // Execute early, as other transformers may depend on correct types
    }

    fn supports_statement_type(&self, stmt: &Statement) -> bool {
        matches!(
            stmt,
            Statement::CreateTable(_)
                | Statement::AlterTable { .. }
                | Statement::CreateIndex { .. }
        )
    }

    fn transform(&self, stmt: &mut Statement) -> TransformationResult<bool> {
        let mut changed = false;

        match stmt {
            Statement::CreateTable(create_table) => {
                for column in &mut create_table.columns {
                    if self.transform_column_data_type(column)? {
                        changed = true;
                    }
                }
            }
            Statement::AlterTable { operations, .. } => {
                // Handle ALTER TABLE operations that modify column types
                for operation in operations {
                    match operation {
                        sqlparser::ast::AlterTableOperation::AddColumn { column_def, .. } => {
                            if self.transform_column_data_type(column_def)? {
                                changed = true;
                            }
                        }
                        _ => {
                            // Other operations don't involve data type transformations
                        }
                    }
                }
            }
            _ => {}
        }

        Ok(changed)
    }
}

impl DataTypeTransformer {
    fn transform_column_data_type(&self, column: &mut ColumnDef) -> TransformationResult<bool> {
        let mut changed = false;

        // Transform the main data type
        if self.transform_data_type(&mut column.data_type)? {
            changed = true;
        }

        // Handle implicit SERIAL detection (PostgreSQL style: INTEGER with DEFAULT nextval(...))
        // This handles cases where SERIAL is parsed as INTEGER with nextval() default
        let mut is_serial_column = false;
        let mut is_bigserial_column = false;

        // Check for existing DEFAULT nextval() patterns that indicate SERIAL
        for option in &column.options {
            if let sqlparser::ast::ColumnOption::Default(expr) = &option.option {
                if let sqlparser::ast::Expr::Function(func) = expr {
                    if func.name.to_string().to_lowercase() == "nextval" {
                        // This is a SERIAL-type column
                        if matches!(column.data_type, DataType::Integer(_)) {
                            is_serial_column = true;
                        } else if matches!(column.data_type, DataType::BigInt(_)) {
                            is_bigserial_column = true;
                        }
                        break;
                    }
                }
            }
        }

        // Transform SERIAL columns
        if is_serial_column {
            // Remove the DEFAULT nextval() option and replace with IDENTITY
            column.options.retain(|opt| {
                !matches!(opt.option, sqlparser::ast::ColumnOption::Default(ref expr)
                    if matches!(expr, sqlparser::ast::Expr::Function(ref func)
                        if func.name.to_string().to_lowercase() == "nextval"))
            });

            // Add IDENTITY column option
            column.options.push(sqlparser::ast::ColumnOptionDef {
                name: None,
                option: sqlparser::ast::ColumnOption::Generated {
                    generated_as: sqlparser::ast::GeneratedAs::ByDefault,
                    sequence_options: None,
                    generation_expr: None,
                    generation_expr_mode: None,
                    generated_keyword: true,
                },
            });
            changed = true;
        } else if is_bigserial_column {
            // Remove the DEFAULT nextval() option and replace with IDENTITY
            column.options.retain(|opt| {
                !matches!(opt.option, sqlparser::ast::ColumnOption::Default(ref expr)
                    if matches!(expr, sqlparser::ast::Expr::Function(ref func)
                        if func.name.to_string().to_lowercase() == "nextval"))
            });

            // Add IDENTITY column option
            column.options.push(sqlparser::ast::ColumnOptionDef {
                name: None,
                option: sqlparser::ast::ColumnOption::Generated {
                    generated_as: sqlparser::ast::GeneratedAs::ByDefault,
                    sequence_options: None,
                    generation_expr: None,
                    generation_expr_mode: None,
                    generated_keyword: true,
                },
            });
            changed = true;
        }

        Ok(changed)
    }
}

/// Get default PostgreSQL to HANA data type mappings
fn get_default_mappings() -> HashMap<String, String> {
    let mut mappings = HashMap::new();

    // Basic type mappings
    mappings.insert("SERIAL".to_string(), "INTEGER".to_string());
    mappings.insert("BIGSERIAL".to_string(), "BIGINT".to_string());
    mappings.insert("TEXT".to_string(), "NCLOB".to_string());
    mappings.insert("JSON".to_string(), "NCLOB".to_string());
    mappings.insert("JSONB".to_string(), "NCLOB".to_string());
    mappings.insert("UUID".to_string(), "NVARCHAR(36)".to_string());
    mappings.insert("INET".to_string(), "NVARCHAR(45)".to_string());
    mappings.insert("MACADDR".to_string(), "NVARCHAR(17)".to_string());
    mappings.insert("BYTEA".to_string(), "BLOB".to_string());

    mappings
}

/// Parse a HANA type string into a DataType enum
fn parse_hana_type(type_str: &str) -> Result<DataType, String> {
    let type_str = type_str.to_uppercase();

    match type_str.as_str() {
        "NCLOB" => Ok(DataType::Clob(None)),
        "BLOB" => Ok(DataType::Blob(None)),
        "INTEGER" => Ok(DataType::Integer(None)),
        "BIGINT" => Ok(DataType::BigInt(None)),
        s if s.starts_with("NVARCHAR(") && s.ends_with(')') => {
            let len_str = &s[9..s.len() - 1];
            if let Ok(length) = len_str.parse::<u64>() {
                Ok(DataType::Nvarchar(Some(
                    sqlparser::ast::CharacterLength::IntegerLength { length, unit: None },
                )))
            } else {
                Err(format!("Invalid NVARCHAR length: {}", len_str))
            }
        }
        s if s.starts_with("NCHAR(") && s.ends_with(')') => {
            let len_str = &s[6..s.len() - 1];
            if let Ok(length) = len_str.parse::<u64>() {
                // Use NVARCHAR since NCHAR doesn't exist in sqlparser
                Ok(DataType::Nvarchar(Some(
                    sqlparser::ast::CharacterLength::IntegerLength { length, unit: None },
                )))
            } else {
                Err(format!("Invalid NCHAR length: {}", len_str))
            }
        }
        _ => Err(format!("Unsupported HANA type: {}", type_str)),
    }
}
