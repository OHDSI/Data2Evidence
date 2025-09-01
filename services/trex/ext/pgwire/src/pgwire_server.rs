use std::sync::{Arc, Mutex};
use std::thread;
use std::time::SystemTime;

use duckdb::{Connection, params};
use async_trait::async_trait;
use futures::stream;

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
}

impl DuckDBQueryHandler {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
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
        let connection = self.connection.clone();
        let query = query.to_string();
        
        // Run the query in a blocking thread to avoid blocking the async runtime
        let result = tokio::task::spawn_blocking(move || -> PgWireResult<Vec<Response<'static>>> {
            let conn = connection.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
            
            let queries: Vec<&str> = query
                .split(';')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .collect();

            let mut responses = Vec::new();

            for sql in queries {
                if sql.to_uppercase().starts_with("SELECT") || sql.to_uppercase().starts_with("WITH") {
                    let mut stmt = conn
                        .prepare(sql)
                        .map_err(|e| PgWireError::ApiError(Box::new(e)))?;

                    let ret = stmt
                        .query_arrow(params![])
                        .map_err(|e| PgWireError::ApiError(Box::new(e)))?;
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
                    if sql.to_uppercase().starts_with("SET") && sql.to_uppercase().contains("EXTRA_FLOAT_DIGITS") {
                        responses.push(Response::Execution(Tag::new("OK").with_rows(0)));
                    } else {
                        let affected_rows = conn.execute_batch(sql)
                            .map_err(|e| PgWireError::ApiError(Box::new(e)))?;
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
        let connection = self.connection.clone();
        let query = portal.statement.statement.clone();
        let _params = get_params(portal);
        
        tokio::task::spawn_blocking(move || -> PgWireResult<Response<'static>> {
            let conn = connection.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
            
            if query.to_uppercase().starts_with("SELECT") || query.to_uppercase().starts_with("WITH") {
                let mut stmt = conn
                    .prepare_cached(&query)
                    .map_err(|e| PgWireError::ApiError(Box::new(e)))?;

                let ret = stmt
                    .query_arrow(params![])
                    .map_err(|e| PgWireError::ApiError(Box::new(e)))?;
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
                if sql.to_uppercase().starts_with("SET") && sql.to_uppercase().contains("EXTRA_FLOAT_DIGITS") {
                    responses.push(Response::Execution(Tag::new("OK").with_rows(0)));
                } else {
                    let affected_rows = conn.execute_batch(sql)
                        .map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                    responses.push(Response::Execution(Tag::new("OK").with_rows(0)));
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
        let connection = self.connection.clone();
        let statement = stmt.statement.clone();
        let param_types = stmt.parameter_types.clone();
        
        tokio::task::spawn_blocking(move || -> PgWireResult<DescribeStatementResponse> {
            let conn = connection.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
            
            let stmt = conn
                .prepare_cached(&statement)
                .map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                
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
        let connection = self.connection.clone();
        let statement = portal.statement.statement.clone();
        let format = portal.result_column_format.clone();
        
        tokio::task::spawn_blocking(move || -> PgWireResult<DescribePortalResponse> {
            let conn = connection.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
            
            let stmt = conn
                .prepare_cached(&statement)
                .map_err(|e| PgWireError::ApiError(Box::new(e)))?;
                
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
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self {
            query_handler: Arc::new(DuckDBQueryHandler::new(connection)),
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
    ) -> Self {
        Self {
            query_handler: Arc::new(DuckDBQueryHandler::new(connection)),
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

/// Start a pgwire server with C API connection
pub fn start_pgwire_server_capi(
    host: String,
    port: u16,
    password: Option<&str>,
) -> Result<String, String> {
    // Check if server is already running
    if ServerRegistry::instance().is_server_running(&host, port) {
        return Err(format!("Server already running on {}:{}", host, port));
    }

    // Create shutdown channel
    let (shutdown_tx, mut shutdown_rx) = oneshot::channel::<()>();

    // Spawn the server thread
    let server_host = host.clone();
    let server_port = port;
    let success_host = host.clone(); // Clone for the success message
    let password_opt = password.map(|s| s.to_string()); // Convert to owned string
    
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

                // Use the shared connection from the extension
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
                    let server_handlers = Arc::new(DuckDBPgWireServerWithAuth::new(shared_connection.clone(), required_password));
                    
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
                    let server_handlers = Arc::new(DuckDBPgWireServerFactory::new(shared_connection.clone()));
                    
                    loop {
                        tokio::select! {
                            _ = &mut shutdown_rx => {
                                println!("Received shutdown signal for server {}:{}", server_host, server_port);
                                break;
                            }
                            // Handle incoming connections  
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
    };
    
    ServerRegistry::instance().register_server(host.clone(), port, server_handle)?;

    Ok(format!("Started pgwire server on {}:{}", success_host, port))
}

pub fn stop_pgwire_server(host: &str, port: u16) -> Result<String, String> {
    ServerRegistry::instance().stop_server(host, port)
}
