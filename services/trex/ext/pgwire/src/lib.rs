extern crate duckdb;
extern crate duckdb_loadable_macros;
extern crate libduckdb_sys;

mod pgwire_server;
mod server_registry;

use duckdb::{
    core::{DataChunkHandle, Inserter, LogicalTypeHandle, LogicalTypeId},
    vtab::{BindInfo, InitInfo, TableFunctionInfo, VTab, arrow::WritableVector},
    vscalar::{VScalar, ScalarFunctionSignature},
    Connection, Result,
};
use duckdb_loadable_macros::duckdb_entrypoint_c_api;
use libduckdb_sys as ffi;
use std::{
    error::Error,
    ffi::CString,
    sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex, OnceLock as OnceCell},
};

static SHARED_CONNECTION: OnceCell<Arc<Mutex<Connection>>> = OnceCell::new();

pub fn store_shared_connection(connection: &Connection) -> Result<(), Box<dyn Error>> {
    let cloned = connection.try_clone()
        .map_err(|e| format!("Failed to clone connection: {}", e))?;
    
    SHARED_CONNECTION.set(Arc::new(Mutex::new(cloned)))
        .map_err(|_| "Connection already stored")?;
    
    Ok(())
}

pub fn get_shared_connection() -> Option<Arc<Mutex<Connection>>> {
    SHARED_CONNECTION.get().cloned()
}

struct PgwireVersionScalar;

impl VScalar for PgwireVersionScalar {
    type State = ();

    unsafe fn invoke(
        _state: &Self::State,
        input: &mut DataChunkHandle,
        output: &mut dyn WritableVector,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if input.len() > 0 {
            let flat_vector = output.flat_vector();
            flat_vector.insert(0, "pgwire extension v0.1.0");
        }
        Ok(())
    }

    fn signatures() -> Vec<ScalarFunctionSignature> {
        vec![ScalarFunctionSignature::exact(
            vec![],
            LogicalTypeId::Varchar.into(),
        )]
    }
}

struct StartPgWireServerScalar;

impl VScalar for StartPgWireServerScalar {
    type State = ();

    unsafe fn invoke(
        _state: &Self::State,
        input: &mut DataChunkHandle,
        output: &mut dyn WritableVector,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let host_vector = input.flat_vector(0);
        let port_vector = input.flat_vector(1);
        let password_vector = input.flat_vector(2);
        let db_credentials_vector = input.flat_vector(3);
        
        let host_slice = host_vector.as_slice_with_len::<libduckdb_sys::duckdb_string_t>(input.len());
        let port_slice = port_vector.as_slice_with_len::<i32>(input.len());
        let password_slice = password_vector.as_slice_with_len::<libduckdb_sys::duckdb_string_t>(input.len());
        let db_credentials_slice = db_credentials_vector.as_slice_with_len::<libduckdb_sys::duckdb_string_t>(input.len());
        
        if input.len() == 0 {
            return Err("No input provided".into());
        }
        
        let host = duckdb::types::DuckString::new(&mut { host_slice[0] }).as_str().to_string();
        let port = port_slice[0] as u16;
        let password = duckdb::types::DuckString::new(&mut { password_slice[0] }).as_str().to_string();
        let db_credentials = duckdb::types::DuckString::new(&mut { db_credentials_slice[0] }).as_str().to_string();
        
        let response = match pgwire_server::start_pgwire_server_capi(host, port, Some(&password), db_credentials) {
            Ok(msg) => msg,
            Err(err) => format!("Error: {}", err),
        };

        let flat_vector = output.flat_vector();
        flat_vector.insert(0, &response);
        Ok(())
    }

    fn signatures() -> Vec<ScalarFunctionSignature> {
        vec![ScalarFunctionSignature::exact(
            vec![
                LogicalTypeId::Varchar.into(),
                LogicalTypeId::Integer.into(),
                LogicalTypeId::Varchar.into(),
                LogicalTypeId::Varchar.into(),
            ],
            LogicalTypeId::Varchar.into(),
        )]
    }
}

struct StopPgWireServerScalar;

impl VScalar for StopPgWireServerScalar {
    type State = ();

    unsafe fn invoke(
        _state: &Self::State,
        input: &mut DataChunkHandle,
        output: &mut dyn WritableVector,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let host_vector = input.flat_vector(0);
        let port_vector = input.flat_vector(1);
        
        let host_slice = host_vector.as_slice_with_len::<libduckdb_sys::duckdb_string_t>(input.len());
        let port_slice = port_vector.as_slice_with_len::<i32>(input.len());
        
        if input.len() == 0 {
            return Err("No input provided".into());
        }
        
        let host = duckdb::types::DuckString::new(&mut { host_slice[0] }).as_str().to_string();
        let port = port_slice[0] as u16;
        
        let response = match pgwire_server::stop_pgwire_server(&host, port) {
            Ok(msg) => msg,
            Err(err) => format!("Error: {}", err),
        };

        let flat_vector = output.flat_vector();
        flat_vector.insert(0, &response);
        Ok(())
    }

    fn signatures() -> Vec<ScalarFunctionSignature> {
        vec![ScalarFunctionSignature::exact(
            vec![
                LogicalTypeId::Varchar.into(),
                LogicalTypeId::Integer.into(),
            ],
            LogicalTypeId::Varchar.into(),
        )]
    }
}

struct UpdateDbCredentialsScalar;

impl VScalar for UpdateDbCredentialsScalar {
    type State = ();

    unsafe fn invoke(
        _state: &Self::State,
        input: &mut DataChunkHandle,
        output: &mut dyn WritableVector,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let credentials_vector = input.flat_vector(0);
        
        let credentials_slice = credentials_vector.as_slice_with_len::<libduckdb_sys::duckdb_string_t>(input.len());
        
        if input.len() == 0 {
            return Err("No input provided".into());
        }
        
        let new_credentials = duckdb::types::DuckString::new(&mut { credentials_slice[0] }).as_str().to_string();
        
        let response = match server_registry::ServerRegistry::instance().update_db_credentials("", 0, new_credentials) {
            Ok(msg) => msg,
            Err(err) => format!("Error: {}", err),
        };

        let flat_vector = output.flat_vector();
        flat_vector.insert(0, &response);
        Ok(())
    }

    fn signatures() -> Vec<ScalarFunctionSignature> {
        vec![ScalarFunctionSignature::exact(
            vec![
                LogicalTypeId::Varchar.into(),
            ],
            LogicalTypeId::Varchar.into(),
        )]
    }
}

struct PgWireServerStatusTable;

#[repr(C)]
struct PgWireServerStatusBindData {}

#[repr(C)]
struct PgWireServerStatusInitData {
    done: AtomicBool,
}

impl VTab for PgWireServerStatusTable {
    type InitData = PgWireServerStatusInitData;
    type BindData = PgWireServerStatusBindData;

    fn bind(bind: &BindInfo) -> Result<Self::BindData, Box<dyn std::error::Error>> {
        bind.add_result_column("hostname", LogicalTypeHandle::from(LogicalTypeId::Varchar));
        bind.add_result_column("port", LogicalTypeHandle::from(LogicalTypeId::Varchar));
        bind.add_result_column("uptime_seconds", LogicalTypeHandle::from(LogicalTypeId::Varchar));
        bind.add_result_column("has_credentials", LogicalTypeHandle::from(LogicalTypeId::Varchar));
        Ok(PgWireServerStatusBindData {})
    }

    fn init(_: &InitInfo) -> Result<Self::InitData, Box<dyn std::error::Error>> {
        Ok(PgWireServerStatusInitData {
            done: AtomicBool::new(false),
        })
    }

    fn func(func: &TableFunctionInfo<Self>, output: &mut DataChunkHandle) -> Result<(), Box<dyn std::error::Error>> {
        let init_data = func.get_init_data();
        
        if init_data.done.swap(true, Ordering::Relaxed) {
            output.set_len(0);
            return Ok(());
        }

        let servers_info = server_registry::ServerRegistry::instance().get_servers_info();
        
        if servers_info.is_empty() {
            output.set_len(0);
            return Ok(());
        }

        let chunk_size = servers_info.len();
        let hostname_vector = output.flat_vector(0);
        let port_vector = output.flat_vector(1);
        let uptime_vector = output.flat_vector(2);
        let credentials_vector = output.flat_vector(3);

        for (i, (hostname, port, uptime_secs, has_credentials)) in servers_info.iter().enumerate() {
            let hostname_cstring = CString::new(hostname.clone())?;
            hostname_vector.insert(i, hostname_cstring);
            
            let port_cstring = CString::new(port.to_string())?;
            port_vector.insert(i, port_cstring);
            
            let uptime_cstring = CString::new(uptime_secs.to_string())?;
            uptime_vector.insert(i, uptime_cstring);
            
            let credentials_cstring = CString::new(has_credentials.to_string())?;
            credentials_vector.insert(i, credentials_cstring);
        }

        output.set_len(chunk_size);
        Ok(())
    }

    fn parameters() -> Option<Vec<LogicalTypeHandle>> {
        None
    }
}

#[duckdb_entrypoint_c_api()]
pub unsafe fn extension_entrypoint(con: Connection) -> Result<(), Box<dyn Error>> {
    store_shared_connection(&con)?;
    
    con.register_scalar_function::<PgwireVersionScalar>("pgwire_version")
        .expect("Failed to register pgwire_version scalar function");

    con.register_scalar_function::<StartPgWireServerScalar>("start_pgwire_server")
        .expect("Failed to register start_pgwire_server function");
    
    con.register_scalar_function::<StopPgWireServerScalar>("stop_pgwire_server")
        .expect("Failed to register stop_pgwire_server function");

    con.register_scalar_function::<UpdateDbCredentialsScalar>("update_db_credentials")
        .expect("Failed to register update_db_credentials function");
        
    con.register_table_function::<PgWireServerStatusTable>("pgwire_server_status")
        .expect("Failed to register pgwire_server_status function");
    
    Ok(())
}