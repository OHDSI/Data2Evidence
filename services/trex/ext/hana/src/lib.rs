use duckdb::{
    Connection, Result,
};
use duckdb_loadable_macros::duckdb_entrypoint_c_api;
use libduckdb_sys as ffi;
use std::error::Error;
mod hana_scan;
mod hana_execute;
pub use hana_scan::{
    validate_hana_connection, parse_hana_url,
    HanaError, HanaPerformanceMetrics, LogLevel, HanaLogger,
    HanaScanVTab, HanaScanBindData, HanaScanInitData
};
pub use hana_execute::HanaExecuteScalar;
pub use hdbconnect::Connection as HanaConnection;

#[allow(dead_code)]
static EXTENSION_NAME: &str = "hana_scan";

#[allow(dead_code)]
static EXTENSION_VERSION: &str = "0.1.0";

#[duckdb_entrypoint_c_api(ext_name = "hana_scan", min_duckdb_version = "v1.3.2")]
pub unsafe fn extension_entrypoint(connection: Connection) -> Result<(), Box<dyn Error>> {
    connection.register_table_function::<hana_scan::HanaScanVTab>("hana_scan")?;
    connection.register_table_function::<hana_scan::HanaScanVTab>("hana_query")?;
    
    connection.register_scalar_function::<HanaExecuteScalar>("hana_execute")?;
    
    Ok(())
}
