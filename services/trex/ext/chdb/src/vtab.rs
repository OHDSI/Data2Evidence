//! Virtual Table (VTab) implementations for ChDB extension

use crate::types::{ChdbScanBindData, ChdbScanInitData, ChdbError, GLOBAL_SESSION};
use crate::functions::{determine_schema, parse_csv_result};
use crate::safe_query_result::safe_execute_query;
use duckdb::{
    vtab::{BindInfo, InitInfo, VTab, TableFunctionInfo},
    core::{LogicalTypeId, DataChunkHandle, Inserter},
    Result,
};
use std::error::Error;
use std::sync::RwLock;
use std::time::SystemTime;
use chdb_rust::{session, arg};

pub struct ChdbScanVTab;

impl VTab for ChdbScanVTab {
    type InitData = ChdbScanInitData;
    type BindData = ChdbScanBindData;

    fn bind(bind: &BindInfo) -> Result<Self::BindData, Box<dyn Error>> {
        let query = bind.get_parameter(0).to_string();
        
        if query.trim().is_empty() {
            return Err(ChdbError::new("Query parameter cannot be empty").into());
        }
        
        crate::chdb_debug!("BIND", "Binding ChDB query: {}", query);

        let session_path = if bind.get_parameter_count() > 1 {
            Some(bind.get_parameter(1).to_string())
        } else {
            None
        };

        let (column_names, column_types) = determine_schema(&query, &session_path)?;
        
        let batch_size = std::env::var("CHDB_BATCH_SIZE")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(1024);

        crate::chdb_debug!("BIND", "Schema determined: {} columns, batch size: {}", column_names.len(), batch_size);

        for (i, column_name) in column_names.iter().enumerate() {
            let logical_type = if i < column_types.len() {
                match column_types[i] {
                    LogicalTypeId::Varchar => LogicalTypeId::Varchar,
                    LogicalTypeId::Boolean => LogicalTypeId::Boolean,
                    LogicalTypeId::Integer => LogicalTypeId::Integer,
                    LogicalTypeId::Double => LogicalTypeId::Double,
                    LogicalTypeId::Date => LogicalTypeId::Date,
                    LogicalTypeId::Timestamp => LogicalTypeId::Timestamp,
                    _ => LogicalTypeId::Varchar,
                }
            } else {
                LogicalTypeId::Varchar
            };
            let type_handle = duckdb::core::LogicalTypeHandle::from(logical_type);
            bind.add_result_column(column_name, type_handle);
        }

        Ok(ChdbScanBindData {
            query,
            session_path,
            batch_size,
            column_names,
            column_types,
        })
    }

    fn init(init: &InitInfo) -> Result<Self::InitData, Box<dyn Error>> {
        let bind_data = init.get_bind_data::<Self::BindData>();
        
        
        if bind_data.is_null() {
            return Err(ChdbError::new("Bind data pointer is null").into());
        }
        
        
        
        let bind_data_ref = unsafe { &*bind_data };

        crate::chdb_debug!("INIT", "Initializing ChDB scan");

        let start_time = SystemTime::now();
        
        let result_data = if let Some(ref _session_path) = bind_data_ref.session_path {
            if let Some(session_arc) = GLOBAL_SESSION.get() {
                if let Ok(session) = session_arc.lock() {
                    crate::chdb_debug!("INIT", "Using global session");
                    let result_string = safe_execute_query(&session, &bind_data_ref.query)
                        .map_err(|e| ChdbError::new(&format!("Session query failed: {}", e)))?;
                    
                    parse_csv_result(&result_string)?
                } else {
                    crate::chdb_debug!("INIT", "Failed to lock global session, creating temporary session");
                    let session = session::SessionBuilder::new()
                        .with_data_path("/tmp/chdb_dml")
                        .with_auto_cleanup(false)
                        .with_arg(arg::Arg::MultiQuery)
                        .build()
                        .map_err(|e| ChdbError::new(&format!("Failed to create ChDB session: {}", e)))?;
                    
                    let result_string = safe_execute_query(&session, &bind_data_ref.query)
                        .map_err(|e| ChdbError::new(&format!("Session query failed: {}", e)))?;
                    
                    parse_csv_result(&result_string)?
                }
            } else {
                crate::chdb_debug!("INIT", "Global session not available, creating temporary session");
                let session = session::SessionBuilder::new()
                    .with_data_path("/tmp/chdb_dml")
                    .with_auto_cleanup(false)
                    .with_arg(arg::Arg::MultiQuery)
                    .build()
                    .map_err(|e| ChdbError::new(&format!("Failed to create ChDB session: {}", e)))?;
                
                let result_string = safe_execute_query(&session, &bind_data_ref.query)
                    .map_err(|e| ChdbError::new(&format!("Session query failed: {}", e)))?;
                
                parse_csv_result(&result_string)?
            }
        } else {
            crate::chdb_debug!("INIT", "Creating standalone session with proper configuration");
            let session = session::SessionBuilder::new()
                .with_data_path("/tmp/chdb_dml")
                .with_auto_cleanup(false)
                .with_arg(arg::Arg::MultiQuery)
                .build()
                .map_err(|e| ChdbError::new(&format!("Failed to create ChDB session: {}", e)))?;
            
            let result_string = safe_execute_query(&session, &bind_data_ref.query)
                .map_err(|e| ChdbError::new(&format!("Session query failed: {}", e)))?;
            
            parse_csv_result(&result_string)?
        };

        let total_rows = result_data.len();
        let execution_time = start_time.elapsed().unwrap_or_default().as_millis();

        crate::chdb_debug!("INIT", "ChDB query executed successfully: {} rows in {}ms", total_rows, execution_time);

        Ok(ChdbScanInitData {
            batch_size: bind_data_ref.batch_size,
            result_data,
            current_row: RwLock::new(0),
            total_rows,
            done: RwLock::new(false),
        })
    }

    fn func(
        info: &TableFunctionInfo<Self>,
        output: &mut DataChunkHandle,
    ) -> Result<(), Box<dyn Error>> {
        let init_data = &*(info.get_init_data());
        
        let current_row = match init_data.current_row.read() {
            Ok(guard) => *guard,
            Err(_) => return Err(ChdbError::new("Failed to read current row position").into()),
        };

        let done = match init_data.done.read() {
            Ok(guard) => *guard,
            Err(_) => return Err(ChdbError::new("Failed to read done status").into()),
        };

        if done || current_row >= init_data.total_rows {
            output.set_len(0);
            return Ok(());
        }

        let remaining_rows = init_data.total_rows - current_row;
        let batch_size = std::cmp::min(remaining_rows, init_data.batch_size);

        if batch_size == 0 {
            output.set_len(0);
            return Ok(());
        }

        output.set_len(batch_size);

        
        
        let column_count = if let Some(first_row) = init_data.result_data.first() {
            first_row.len()
        } else {
            0
        };
        
        for col_idx in 0..column_count {
            let flat_vector = output.flat_vector(col_idx);
            
            for row_idx in 0..batch_size {
                let global_row_idx = current_row + row_idx;
                if global_row_idx >= init_data.result_data.len() {
                    break;
                }

                let row = &init_data.result_data[global_row_idx];
                if col_idx < row.len() {
                    let value = &row[col_idx];
                    flat_vector.insert(row_idx, value.as_str());
                } else {
                    flat_vector.insert(row_idx, "");
                }
            }
        }

        if let Ok(mut current_row) = init_data.current_row.write() {
            *current_row += batch_size;
        }

        if current_row + batch_size >= init_data.total_rows {
            if let Ok(mut done) = init_data.done.write() {
                *done = true;
            }
        }

        Ok(())
    }

    fn parameters() -> Option<Vec<duckdb::core::LogicalTypeHandle>> {
        Some(vec![
            duckdb::core::LogicalTypeHandle::from(LogicalTypeId::Varchar),
        ])
    }
}
