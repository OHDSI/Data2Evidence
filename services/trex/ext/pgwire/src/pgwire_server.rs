use std::sync::{Arc, Mutex};
use std::thread;
use std::time::SystemTime;

use duckdb::{Connection, params};
use async_trait::async_trait;
use futures::stream;
use serde_json;
use base64::{Engine as _, engine::general_purpose};

use pgwire::api::auth::StartupHandler;
use pgwire::api::auth::scram::{gen_salted_password, SASLScramAuthStartupHandler};
use pgwire::api::auth::{AuthSource, DefaultServerParameterProvider, LoginInfo, Password};
use pgwire::api::query::{ExtendedQueryHandler, SimpleQueryHandler};
use pgwire::api::stmt::NoopQueryParser;
use pgwire::api::results::{Response, Tag, QueryResponse, DescribeStatementResponse, DescribePortalResponse, FieldInfo};
use pgwire::api::{PgWireServerHandlers, ClientInfo, NoopHandler, Type};
use pgwire::api::portal::{Portal, Format};
use pgwire::api::stmt::StoredStatement;
use pgwire::error::{ErrorInfo, PgWireError, PgWireResult};
use pgwire::tokio::process_socket;

use tokio::net::TcpListener;
use tokio::sync::oneshot;

use arrow_pg::datatypes::{arrow_schema_to_pg_fields, encode_recordbatch, into_pg_type};

use crate::get_shared_connection;
use crate::server_registry::{ServerHandle, ServerRegistry};

const SCRAM_ITERATIONS: usize = 4096;

#[derive(Debug, Clone)]
pub struct HanaCredentials {
    pub host: String,
    pub port: u16,
    pub name: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug)]
pub enum DatabaseAction {
    SetDatabase,
    UseHana(HanaCredentials),
    Skip,
}

pub fn check_database_action(database_name: &str, db_credentials: &str) -> DatabaseAction {
    if let Ok(decoded_bytes) = general_purpose::STANDARD.decode(db_credentials) {
        if let Ok(decoded_str) = String::from_utf8(decoded_bytes) {
            if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&decoded_str) {
                if let Some(databases) = json_value.as_array() {
                    for db in databases {
                        if let Some(db_id) = db.get("id").and_then(|v| v.as_str()) {
                            if db_id == database_name {
                                if let Some(dialect) = db.get("dialect").and_then(|v| v.as_str()) {
                                    if dialect == "hana" {
                                        if let (Some(host), Some(port), Some(name)) = (
                                            db.get("host").and_then(|v| v.as_str()),
                                            db.get("port").and_then(|v| v.as_u64()),
                                            db.get("name").and_then(|v| v.as_str())
                                        ) {
                                            if let Some(credentials_array) = db.get("credentials").and_then(|v| v.as_array()) {
                                                for cred in credentials_array {
                                                    if let Some(user_scope) = cred.get("userScope").and_then(|v| v.as_str()) {
                                                        if user_scope == "Admin" {
                                                            if let (Some(username), Some(password)) = (
                                                                cred.get("username").and_then(|v| v.as_str()),
                                                                cred.get("password").and_then(|v| v.as_str())
                                                            ) {
                                                                return DatabaseAction::UseHana(HanaCredentials {
                                                                    host: host.to_string(),
                                                                    port: port as u16,
                                                                    name: name.to_string(),
                                                                    username: username.to_string(),
                                                                    password: password.to_string(),
                                                                });
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        return DatabaseAction::Skip;
                                    } else {
                                        return DatabaseAction::SetDatabase;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    DatabaseAction::Skip
}

fn get_hana_credentials_if_available(
    database: &Option<String>,
    server_host: &str,
    server_port: u16,
) -> Option<HanaCredentials> {
    if let Some(db) = database {
        if let Some(db_credentials) = ServerRegistry::instance().get_db_credentials(server_host, server_port) {
            match check_database_action(db, &db_credentials) {
                DatabaseAction::UseHana(hana_creds) => {
                    Some(hana_creds)
                }
                _ => None
            }
        } else {
            None
        }
    } else {
        None
    }
}

fn wrap_query_for_hana(query: &str, hana_creds: &HanaCredentials) -> String {
    let escaped_query = query.replace("'", "''");
    
    if query.to_uppercase().starts_with("SELECT") || query.to_uppercase().starts_with("WITH") {
        format!(
            "SELECT * FROM hana_scan('{}', 'hdbsql://{}:{}@{}:{}/{}')",
            escaped_query,
            hana_creds.username,
            hana_creds.password,
            hana_creds.host,
            hana_creds.port,
            hana_creds.name
        )
    } else {
        format!(
            "SELECT hana_execute('{}', 'hdbsql://{}:{}@{}:{}/{}')",
            escaped_query,
            hana_creds.username,
            hana_creds.password,
            hana_creds.host,
            hana_creds.port,
            hana_creds.name
        )
    }
}

fn execute_with_fallback<F, R>(
    primary_query: &str,
    fallback_query: Option<&str>,
    operation: F,
) -> Result<R, duckdb::Error>
where
    F: Fn(&str) -> Result<R, duckdb::Error>,
{
    let result = operation(primary_query);
    
    if result.is_err() && fallback_query.is_some() {
        eprintln!("Primary query failed, falling back to original query. Error: {:?}", result.as_ref().err());
        operation(fallback_query.unwrap())
    } else {
        result
    }
}

pub fn random_salt() -> Vec<u8> {
    Vec::from(rand::random::<[u8; 10]>())
}

pub struct SimpleAuthSource {
    required_password: String,
}

impl SimpleAuthSource {
    pub fn new(password: String) -> Self {
        Self {
            required_password: password,
        }
    }
}

#[async_trait]
impl AuthSource for SimpleAuthSource {
    async fn get_password(&self, _login_info: &LoginInfo) -> PgWireResult<Password> {
        let salt = random_salt();
        let hash_password = gen_salted_password(&self.required_password, salt.as_ref(), SCRAM_ITERATIONS);
        Ok(Password::new(Some(salt), hash_password))
    }
}

#[derive(Clone)]
pub struct DuckDBQueryHandler {
    connection: Arc<Mutex<Connection>>,
    server_host: String,
    server_port: u16,
}

impl DuckDBQueryHandler {
    pub fn new(connection: Arc<Mutex<Connection>>, host: String, port: u16) -> Self {
        Self { 
            connection,
            server_host: host,
            server_port: port,
        }
    }
}

fn get_params(_portal: &Portal<String>) -> Vec<String> {
    Vec::new()
}

fn row_desc_from_stmt(stmt: &duckdb::Statement, format: &Format) -> PgWireResult<Vec<FieldInfo>> {
    let columns = stmt.column_count();

    (0..columns)
        .map(|idx| {
            let datatype = stmt.column_type(idx);
            let name = stmt.column_name(idx).map_or("unknown".to_string(), |v| v.clone());

            Ok(FieldInfo::new(
                name.to_string(),
                None,
                None,
                into_pg_type(&datatype).unwrap_or(Type::TEXT),
                format.format_for(idx),
            ))
        })
        .collect()
}

#[async_trait]
impl SimpleQueryHandler for DuckDBQueryHandler {
    async fn do_query<'a, C>(&self, _client: &mut C, query: &str) -> PgWireResult<Vec<Response<'a>>>
    where
        C: ClientInfo + Unpin + Send + Sync,
    {
        let login_info = LoginInfo::from_client_info(_client);
        let database = login_info.database().map(|s| s.to_string());
        
        let connection = self.connection.clone();
        let query = query.to_string();
        let server_host = self.server_host.clone();
        let server_port = self.server_port;
        
        let result = tokio::task::spawn_blocking(move || -> PgWireResult<Vec<Response<'static>>> {
            let conn = connection.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
            
            
            if let Some(db) = &database {
                if let Some(db_credentials) = ServerRegistry::instance().get_db_credentials(&server_host, server_port) {
                    match check_database_action(db, &db_credentials) {
                        DatabaseAction::SetDatabase => {
                            if let Err(e) = conn.execute(&format!("USE {}", db), params![]) {
                                eprintln!("Warning: Failed to set database '{}': {}", db, e);
                            }
                        }
                        _ => {}
                    }
                }
            }
            
            let queries: Vec<&str> = query
                .split(';')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .collect();

            let mut responses = Vec::new();

            for tmpsql in queries {
                let sql = &tmpsql.replace("::regclass", "::string")
        .replace("AND datallowconn AND NOT datistemplate", "AND NOT db.datname =('system') AND NOT db.datname =('temp')")
        .replace("pg_get_expr(ad.adbin, ad.adrelid, true)","pg_get_expr(ad.adbin, ad.adrelid)")
        .replace("pg_catalog.pg_relation_size(i.indexrelid)","''")
        .replace("pg_catalog.pg_stat_get_numscans(i.indexrelid)","''")
        .replace("pg_catalog.pg_inherits i,pg_catalog.pg_class c WHERE",
        "(select 0 as inhseqno, 0 as inhrelid, 0 as inhparent) as i join pg_catalog.pg_class as c ON")
        .replace("SELECT c.oid,c.*,t.relname as tabrelname,rt.relnamespace as refnamespace,d.description, null as consrc_copy",
        "SELECT c.oid,t.relname  as tabrelname,rt.relnamespace as refnamespace,d.description, null as consrc_copy");

                let hana_credentials = get_hana_credentials_if_available(&database, &server_host, server_port);

                let (actual_sql, fallback_sql) = if let Some(hana_creds) = &hana_credentials {
                    (wrap_query_for_hana(sql, hana_creds), Some(sql.to_string()))
                } else {
                    (sql.to_string(), None)
                };

                if actual_sql.to_uppercase().starts_with("SELECT") || actual_sql.to_uppercase().starts_with("WITH") {
                    let fallback_ref = fallback_sql.as_deref();
                    
                    
                    
                    let mut stmt_result = conn.prepare(&actual_sql);  
                    let mut query_to_use = actual_sql.as_str();
                    
                    if stmt_result.is_err() && fallback_ref.is_some() {
                        eprintln!("HANA wrapped query prepare failed, falling back to original query. Error: {:?}", stmt_result.as_ref().err());
                        stmt_result = conn.prepare(fallback_ref.unwrap());  
                        query_to_use = fallback_ref.unwrap();
                    }
                    
                    let mut stmt = stmt_result.map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                    
                    let mut ret_result = stmt.query_arrow(params![]);
                    
                    if ret_result.is_err() && fallback_ref.is_some() && query_to_use != fallback_ref.unwrap() {
                        eprintln!("HANA wrapped query execution failed, falling back to original query. Error: {:?}", ret_result.as_ref().err());
                        stmt = conn.prepare(fallback_ref.unwrap()).map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                        ret_result = stmt.query_arrow(params![]);
                    }
                    
                    let ret = ret_result.map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                    let schema = ret.get_schema();
                    let header = Arc::new(arrow_schema_to_pg_fields(
                        schema.as_ref(),
                        &Format::UnifiedText,
                    )?);

                    let header_ref = header.clone();
                    let data = ret
                        .flat_map(move |rb| encode_recordbatch(header_ref.clone(), rb))
                        .collect::<Vec<_>>();
                        
                    responses.push(Response::Query(QueryResponse::new(
                        header,
                        stream::iter(data.into_iter()),
                    )));
                } else {
                    if sql.to_uppercase().starts_with("SET") 
                    && (sql.to_uppercase().contains("EXTRA_FLOAT_DIGITS") 
                        || sql.to_uppercase().contains("APPLICATION_NAME")) {
                        responses.push(Response::Execution(Tag::new("OK")));
                    } else {
                        let fallback_ref = fallback_sql.as_deref();
                        
                        let _affected_rows = execute_with_fallback(&actual_sql, fallback_ref, |query_str| {
                            conn.execute_batch(query_str)
                        }).map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                        
                        responses.push(Response::Execution(Tag::new("OK").with_rows(0)));
                    }
                }
            }

            if responses.is_empty() {
                responses.push(Response::Execution(Tag::new("OK").with_rows(0)));
            }

            Ok(responses)
        })
        .await
        .map_err(|e| {
            PgWireError::UserError(Box::new(ErrorInfo::new(
                "ERROR".to_owned(),
                "XX000".to_owned(),
                format!("Task execution failed: {}", e),
            )))
        })??;

        Ok(result)
    }
}

#[async_trait]
impl ExtendedQueryHandler for DuckDBQueryHandler {
    type Statement = String;
    type QueryParser = NoopQueryParser;

    fn query_parser(&self) -> Arc<Self::QueryParser> {
        Arc::new(NoopQueryParser::new())
    }

    async fn do_query<'a, C>(
        &self,
        _client: &mut C,
        portal: &Portal<Self::Statement>,
        _max_rows: usize,
    ) -> PgWireResult<Response<'a>>
    where
        C: ClientInfo + Unpin + Send + Sync,
    {
        let login_info = LoginInfo::from_client_info(_client);
        let database = login_info.database().map(|s| s.to_string());
        
        let connection = self.connection.clone();
        let query = portal.statement.statement.clone();
        let _params = get_params(portal);
        let server_host = self.server_host.clone();
        let server_port = self.server_port;
        
        tokio::task::spawn_blocking(move || -> PgWireResult<Response<'static>> {
            let conn = connection.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
            
            let hana_credentials = get_hana_credentials_if_available(&database, &server_host, server_port);
            
            let (actual_query, fallback_query) = if let Some(hana_creds) = &hana_credentials {
                (wrap_query_for_hana(&query, hana_creds), Some(query.clone()))
            } else {
                (query.clone(), None)
            };
            
            if actual_query.to_uppercase().starts_with("SELECT") || actual_query.to_uppercase().starts_with("WITH") {
                let fallback_ref = fallback_query.as_deref();
                
                
                
                let mut stmt_result = conn.prepare(&actual_query);  
                let mut query_to_use = actual_query.as_str();
                
                if stmt_result.is_err() && fallback_ref.is_some() {
                    eprintln!("HANA wrapped query prepare failed, falling back to original query. Error: {:?}", stmt_result.as_ref().err());
                    stmt_result = conn.prepare(fallback_ref.unwrap());  
                    query_to_use = fallback_ref.unwrap();
                }
                
                let mut stmt = stmt_result.map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                
                let mut ret_result = stmt.query_arrow(params![]);
                
                if ret_result.is_err() && fallback_ref.is_some() && query_to_use != fallback_ref.unwrap() {
                    eprintln!("HANA wrapped query execution failed, falling back to original query. Error: {:?}", ret_result.as_ref().err());
                    stmt = conn.prepare(fallback_ref.unwrap()).map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                    ret_result = stmt.query_arrow(params![]);
                }
                
                let ret = ret_result.map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                let schema = ret.get_schema();
                let header = Arc::new(arrow_schema_to_pg_fields(
                    schema.as_ref(),
                    &Format::UnifiedText,
                )?);

                let header_ref = header.clone();
                let data = ret
                    .flat_map(move |rb| encode_recordbatch(header_ref.clone(), rb))
                    .collect::<Vec<_>>();

                Ok(Response::Query(QueryResponse::new(
                    header,
                    stream::iter(data.into_iter()),
                )))
            } else {
                if query.to_uppercase().starts_with("SET") 
                && (query.to_uppercase().contains("EXTRA_FLOAT_DIGITS") 
                    || query.to_uppercase().contains("APPLICATION_NAME")) {
                    Ok(Response::Execution(Tag::new("OK")))
                } else {
                    let fallback_ref = fallback_query.as_deref();
                    
                    let _affected_rows = execute_with_fallback(&actual_query, fallback_ref, |query_str| {
                        conn.execute_batch(query_str)
                    }).map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                    
                    Ok(Response::Execution(Tag::new("OK").with_rows(0)))
                }
            }
        })
        .await
        .map_err(|e| {
            PgWireError::UserError(Box::new(ErrorInfo::new(
                "ERROR".to_owned(),
                "XX000".to_owned(),
                format!("Task execution failed: {}", e),
            )))
        })?
    }

    async fn do_describe_statement<C>(
        &self,
        _client: &mut C,
        stmt: &StoredStatement<Self::Statement>,
    ) -> PgWireResult<DescribeStatementResponse>
    where
        C: ClientInfo + Unpin + Send + Sync,
    {
        let login_info = LoginInfo::from_client_info(_client);
        let database = login_info.database().map(|s| s.to_string());
        
        let connection = self.connection.clone();
        let statement = stmt.statement.clone();
        let param_types = stmt.parameter_types.clone();
        let server_host = self.server_host.clone();
        let server_port = self.server_port;
        
        tokio::task::spawn_blocking(move || -> PgWireResult<DescribeStatementResponse> {
            let conn = connection.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
            
            
            let hana_credentials = get_hana_credentials_if_available(&database, &server_host, server_port);
            
            let (actual_statement, fallback_statement) = if let Some(hana_creds) = &hana_credentials {
                (wrap_query_for_hana(&statement, hana_creds), Some(statement.clone()))
            } else {
                (statement.clone(), None)
            };
            
            let fallback_ref = fallback_statement.as_deref();
            let stmt = execute_with_fallback(&actual_statement, fallback_ref, |query_str| {
                conn.prepare(query_str)  
            }).map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                
            let fields = row_desc_from_stmt(&stmt, &Format::UnifiedBinary)?;
            Ok(DescribeStatementResponse::new(param_types, fields))
        })
        .await
        .map_err(|e| {
            PgWireError::UserError(Box::new(ErrorInfo::new(
                "ERROR".to_owned(),
                "XX000".to_owned(),
                format!("Task execution failed: {}", e),
            )))
        })?
    }

    async fn do_describe_portal<C>(
        &self,
        _client: &mut C,
        portal: &Portal<Self::Statement>,
    ) -> PgWireResult<DescribePortalResponse>
    where
        C: ClientInfo + Unpin + Send + Sync,
    {
        let login_info = LoginInfo::from_client_info(_client);
        let database = login_info.database().map(|s| s.to_string());
        
        let connection = self.connection.clone();
        let statement = portal.statement.statement.clone();
        let format = portal.result_column_format.clone();
        let server_host = self.server_host.clone();
        let server_port = self.server_port;
        
        tokio::task::spawn_blocking(move || -> PgWireResult<DescribePortalResponse> {
            let conn = connection.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
            
            
            let hana_credentials = get_hana_credentials_if_available(&database, &server_host, server_port);
            
            let (actual_statement, fallback_statement) = if let Some(hana_creds) = &hana_credentials {
                (wrap_query_for_hana(&statement, hana_creds), Some(statement.clone()))
            } else {
                (statement.clone(), None)
            };
            
            let fallback_ref = fallback_statement.as_deref();
            let stmt = execute_with_fallback(&actual_statement, fallback_ref, |query_str| {
                conn.prepare(query_str)  
            }).map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                
            let fields = row_desc_from_stmt(&stmt, &format)?;
            Ok(DescribePortalResponse::new(fields))
        })
        .await
        .map_err(|e| {
            PgWireError::UserError(Box::new(ErrorInfo::new(
                "ERROR".to_owned(),
                "XX000".to_owned(),
                format!("Task execution failed: {}", e),
            )))
        })?
    }
}

pub struct DuckDBPgWireServerFactory {
    query_handler: Arc<DuckDBQueryHandler>,
}

impl DuckDBPgWireServerFactory {
    pub fn new(connection: Arc<Mutex<Connection>>, host: String, port: u16) -> Self {
        Self {
            query_handler: Arc::new(DuckDBQueryHandler::new(connection, host, port)),
        }
    }
}

impl PgWireServerHandlers for DuckDBPgWireServerFactory {
    fn simple_query_handler(&self) -> Arc<impl SimpleQueryHandler> {
        self.query_handler.clone()
    }

    fn extended_query_handler(&self) -> Arc<impl ExtendedQueryHandler> {
        self.query_handler.clone()
    }

    fn startup_handler(&self) -> Arc<impl StartupHandler> {
        Arc::new(NoopHandler)
    }
}

pub struct DuckDBPgWireServerWithAuth {
    query_handler: Arc<DuckDBQueryHandler>,
    password: String,
}

impl DuckDBPgWireServerWithAuth {
    pub fn new(
        connection: Arc<Mutex<Connection>>, 
        password: String,
        host: String,
        port: u16,
    ) -> Self {
        Self {
            query_handler: Arc::new(DuckDBQueryHandler::new(connection, host, port)),
            password,
        }
    }
}

impl PgWireServerHandlers for DuckDBPgWireServerWithAuth {
    fn simple_query_handler(&self) -> Arc<impl SimpleQueryHandler> {
        self.query_handler.clone()
    }

    fn extended_query_handler(&self) -> Arc<impl ExtendedQueryHandler> {
        self.query_handler.clone()
    }

    fn startup_handler(&self) -> Arc<impl StartupHandler> {
        let auth_source = SimpleAuthSource::new(self.password.clone());
        let parameter_provider = DefaultServerParameterProvider::default();
        let mut scram_handler = SASLScramAuthStartupHandler::new(
            Arc::new(auth_source), 
            Arc::new(parameter_provider)
        );
        scram_handler.set_iterations(SCRAM_ITERATIONS);
        Arc::new(scram_handler)
    }
}

pub fn start_pgwire_server_capi(
    host: String,
    port: u16,
    password: Option<&str>,
    db_credentials: String,
) -> Result<String, String> {
    if ServerRegistry::instance().is_server_running(&host, port) {
        return Err(format!("Server already running on {}:{}", host, port));
    }

    let (shutdown_tx, mut shutdown_rx) = oneshot::channel::<()>();

    let server_host = host.clone();
    let server_port = port;
    let success_host = host.clone();
    let password_opt = password.map(|s| s.to_string());
    
    let thread_handle = thread::Builder::new()
        .name(format!("pgwire-server-{}:{}", host, port))
        .spawn(move || -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
            let rt = match tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build() {
                Ok(rt) => rt,
                Err(e) => {
                    eprintln!("Failed to create Tokio runtime: {}", e);
                    return Err(e.into());
                }
            };

            let result = rt.block_on(async move {
                println!("DuckDB pgwire server listening on {}:{}", server_host, server_port);

                let listener = match TcpListener::bind(format!("{}:{}", server_host, server_port)).await {
                    Ok(listener) => listener,
                    Err(e) => {
                        eprintln!("Failed to bind to {}:{}: {}", server_host, server_port, e);
                        return Err(e.into());
                    }
                };

                let shared_connection = match get_shared_connection() {
                    Some(conn) => conn,
                    None => {
                        eprintln!("Shared connection not available, falling back to in-memory connection");
                        Arc::new(Mutex::new(
                            Connection::open_in_memory().expect("Failed to create fallback connection")
                        ))
                    }
                };
                if let Some(required_password) = password_opt {
                    let server_handlers = Arc::new(DuckDBPgWireServerWithAuth::new(shared_connection.clone(), required_password, server_host.clone(), server_port));
                    
                    loop {
                        tokio::select! {
                            _ = &mut shutdown_rx => {
                                println!("Received shutdown signal for server {}:{}", server_host, server_port);
                                break;
                            }
                            result = listener.accept() => {
                                match result {
                                    Ok((socket, addr)) => {
                                        println!("New connection from: {}", addr);
                                        let handlers = server_handlers.clone();
                                        tokio::spawn(async move {
                                            if let Err(e) = process_socket(socket, None, handlers).await {
                                                eprintln!("Error processing connection from {}: {}", addr, e);
                                            }
                                        });
                                    }
                                    Err(e) => {
                                        eprintln!("Failed to accept connection: {}", e);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    let server_handlers = Arc::new(DuckDBPgWireServerFactory::new(shared_connection.clone(), server_host.clone(), server_port));
                    
                    loop {
                        tokio::select! {
                            _ = &mut shutdown_rx => {
                                println!("Received shutdown signal for server {}:{}", server_host, server_port);
                                break;
                            }
                            result = listener.accept() => {
                                match result {
                                    Ok((socket, addr)) => {
                                        println!("New connection from: {}", addr);
                                        let handlers = server_handlers.clone();
                                        tokio::spawn(async move {
                                            if let Err(e) = process_socket(socket, None, handlers).await {
                                                eprintln!("Error processing connection from {}: {}", addr, e);
                                            }
                                        });
                                    }
                                    Err(e) => {
                                        eprintln!("Failed to accept connection: {}", e);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                
                Ok(())
            });
            
            result
        })
        .map_err(|e| format!("Failed to spawn server thread: {}", e))?;

    let start_time = SystemTime::now();
    let server_handle = ServerHandle {
        thread_handle,
        shutdown_tx,
        start_time,
        db_credentials,
    };
    
    ServerRegistry::instance().register_server(host.clone(), port, server_handle)?;

    Ok(format!("Started pgwire server on {}:{}", success_host, port))
}

pub fn stop_pgwire_server(host: &str, port: u16) -> Result<String, String> {
    ServerRegistry::instance().stop_server(host, port)
}
