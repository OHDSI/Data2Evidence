use duckdb::{
    core::{DataChunkHandle, LogicalTypeId, Inserter},
    vtab::arrow::WritableVector,
    vscalar::{VScalar, ScalarFunctionSignature},
};
use std::error::Error;
use crate::{HanaConnection, HanaError};

pub struct HanaExecuteScalar;

impl VScalar for HanaExecuteScalar {
    type State = ();

    unsafe fn invoke(
        _state: &Self::State,
        input: &mut DataChunkHandle,
        output: &mut dyn WritableVector,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if input.len() == 0 {
            return Err("No input provided".into());
        }

        let connection_string_vector = input.flat_vector(0);
        let sql_statement_vector = input.flat_vector(1);
        
        let connection_string_slice = connection_string_vector.as_slice_with_len::<libduckdb_sys::duckdb_string_t>(input.len());
        let sql_statement_slice = sql_statement_vector.as_slice_with_len::<libduckdb_sys::duckdb_string_t>(input.len());
        
        let connection_string = {
            let mut binding = connection_string_slice[0];
            duckdb::types::DuckString::new(&mut binding).as_str().to_string()
        };
        
        let sql_statement = {
            let mut binding = sql_statement_slice[0];
            duckdb::types::DuckString::new(&mut binding).as_str().to_string()
        };
        
        let result = match execute_hana_statement(&connection_string, &sql_statement) {
            Ok(rows_affected) => format!("Success: {} rows affected", rows_affected),
            Err(err) => format!("Error: {}", err),
        };

        let flat_vector = output.flat_vector();
        flat_vector.insert(0, &result);
        Ok(())
    }

    fn signatures() -> Vec<ScalarFunctionSignature> {
        vec![ScalarFunctionSignature::exact(
            vec![
                LogicalTypeId::Varchar.into(), // connection_string
                LogicalTypeId::Varchar.into(), // sql_statement
            ],
            LogicalTypeId::Varchar.into(), // result message
        )]
    }
}

fn execute_hana_statement(connection_string: &str, sql_statement: &str) -> Result<usize, Box<dyn Error>> {
    let connection = HanaConnection::new(connection_string.to_string())?;
    
    match connection.prepare(sql_statement) {
        Ok(mut prepared) => {
            match prepared.execute(&()) {
                Ok(_) => {
                    Ok(1) // TODO: Get actual affected rows count if available
                }
                Err(e) => Err(Box::new(HanaError::query(
                    &format!("Failed to execute statement: {}", e),
                    Some(sql_statement),
                    None,
                    "execute_hana_statement"
                )))
            }
        }
        Err(e) => Err(Box::new(HanaError::query(
            &format!("Failed to prepare statement: {}", e),
            Some(sql_statement),
            None,
            "execute_hana_statement"
        )))
    }
}
