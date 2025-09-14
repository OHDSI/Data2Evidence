//! Scalar function implementations for ChDB extension

use crate::functions::{start_chdb_database_scalar, stop_chdb_database_scalar, execute_dml_database_scalar};
use duckdb::{
    vscalar::{VScalar, ScalarFunctionSignature},
    vtab::arrow::WritableVector,
    core::{LogicalTypeId, DataChunkHandle, Inserter},
};

pub struct StartChdbDatabaseScalar;

impl VScalar for StartChdbDatabaseScalar {
    type State = ();

    unsafe fn invoke(
        _state: &Self::State,
        input: &mut DataChunkHandle,
        output: &mut dyn WritableVector,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let data_path = if input.len() > 0 {
            let path_vector = input.flat_vector(0);
            let path_slice = path_vector.as_slice_with_len::<libduckdb_sys::duckdb_string_t>(input.len());
            if let Some(first_path) = path_slice.get(0) {
                let path = duckdb::types::DuckString::new(&mut { *first_path }).as_str().to_string();
                if path.is_empty() { None } else { Some(path) }
            } else { None }
        } else { None };
        
        let result = match start_chdb_database_scalar(data_path.as_deref()) {
            Ok(result) => result,
            Err(e) => format!("Error: {}", e),
        };
        
        let flat_vector = output.flat_vector();
        flat_vector.insert(0, &result);
        Ok(())
    }

    fn signatures() -> Vec<ScalarFunctionSignature> {
        vec![
            ScalarFunctionSignature::exact(
                vec![], 
                LogicalTypeId::Varchar.into(),
            ),
            ScalarFunctionSignature::exact(
                vec![LogicalTypeId::Varchar.into()], 
                LogicalTypeId::Varchar.into(),
            ),
        ]
    }
}

pub struct StopChdbDatabaseScalar;

impl VScalar for StopChdbDatabaseScalar {
    type State = ();

    unsafe fn invoke(
        _state: &Self::State,
        _input: &mut DataChunkHandle,
        output: &mut dyn WritableVector,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let result = match stop_chdb_database_scalar() {
            Ok(result) => result,
            Err(e) => format!("Error: {}", e),
        };
        
        let flat_vector = output.flat_vector();
        flat_vector.insert(0, &result);
        Ok(())
    }

    fn signatures() -> Vec<ScalarFunctionSignature> {
        vec![ScalarFunctionSignature::exact(
            vec![], 
            LogicalTypeId::Varchar.into(),
        )]
    }
}

pub struct ExecuteDmlScalar;

impl VScalar for ExecuteDmlScalar {
    type State = ();

    unsafe fn invoke(
        _state: &Self::State,
        input: &mut DataChunkHandle,
        output: &mut dyn WritableVector,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if input.len() == 0 {
            let flat_vector = output.flat_vector();
            flat_vector.insert(0, "Error: Query parameter required");
            return Ok(());
        }
        
        let query_vector = input.flat_vector(0);
        let query_slice = query_vector.as_slice_with_len::<libduckdb_sys::duckdb_string_t>(input.len());
        
        if let Some(first_query) = query_slice.get(0) {
            let query = duckdb::types::DuckString::new(&mut { *first_query }).as_str().to_string();     
            
            let result = {
                match execute_dml_database_scalar(&query) {
                    Ok(result) => result,
                    Err(e) => format!("Error: DML execution failed: {}", e),
                }
            };
            
            let flat_vector = output.flat_vector();
            flat_vector.insert(0, &result);
        } else {
            let flat_vector = output.flat_vector();
            flat_vector.insert(0, "Error: Invalid query parameter");
        }
        
        Ok(())
    }

    fn signatures() -> Vec<ScalarFunctionSignature> {
        vec![ScalarFunctionSignature::exact(
            vec![LogicalTypeId::Varchar.into()], 
            LogicalTypeId::Varchar.into(),
        )]
    }
}
