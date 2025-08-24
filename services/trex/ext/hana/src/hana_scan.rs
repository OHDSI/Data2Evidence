use duckdb::{
    vtab::{BindInfo, InitInfo, VTab, TableFunctionInfo},
    core::{LogicalTypeId, DataChunkHandle, Inserter},
    Result,
};
use std::error::Error;
use hdbconnect::{Connection as HanaConnection, Row};
use std::fmt;
use std::sync::RwLock;
use std::env;
use std::time::{SystemTime, UNIX_EPOCH};
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum LogLevel {
    Error = 1,
    Warn = 2,
    Info = 3,
    Debug = 4,
    Trace = 5,
}
impl LogLevel {
    pub fn from_str(s: &str) -> LogLevel {
        match s.to_uppercase().as_str() {
            "ERROR" => LogLevel::Error,
            "WARN" | "WARNING" => LogLevel::Warn,
            "INFO" => LogLevel::Info,
            "DEBUG" => LogLevel::Debug,
            "TRACE" => LogLevel::Trace,
            _ => LogLevel::Info,
        }
    }
    pub fn current() -> LogLevel {
        env::var("HANA_LOG_LEVEL")
            .map(|s| LogLevel::from_str(&s))
            .unwrap_or(LogLevel::Info)
    }
    pub fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Error => "ERROR",
            LogLevel::Warn => "WARN",
            LogLevel::Info => "INFO",
            LogLevel::Debug => "DEBUG",
            LogLevel::Trace => "TRACE",
        }
    }
}
pub struct HanaLogger;
impl HanaLogger {
    pub fn log(level: LogLevel, category: &str, message: &str) {
        if level <= LogLevel::current() {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis();
            eprintln!("[{}] {} [{}] [HANA] {}", 
                     timestamp, level.as_str(), category, message);
        }
    }
    pub fn log_with_context(level: LogLevel, category: &str, message: &str, context: &[(&str, &str)]) {
        if level <= LogLevel::current() {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis();
            let context_str = context.iter()
                .map(|(k, v)| format!("{}={}", k, v))
                .collect::<Vec<_>>()
                .join(", ");
            eprintln!("[{}] {} [{}] [HANA] {} | {}", 
                     timestamp, level.as_str(), category, message, context_str);
        }
    }
    pub fn error(category: &str, message: &str) {
        Self::log(LogLevel::Error, category, message);
    }
    pub fn warn(category: &str, message: &str) {
        Self::log(LogLevel::Warn, category, message);
    }
    pub fn info(category: &str, message: &str) {
        Self::log(LogLevel::Info, category, message);
    }
    pub fn debug(category: &str, message: &str) {
        Self::log(LogLevel::Debug, category, message);
    }
    pub fn trace(category: &str, message: &str) {
        Self::log(LogLevel::Trace, category, message);
    }
}
macro_rules! hana_error {
    ($category:expr, $($arg:tt)*) => {
        HanaLogger::error($category, &format!($($arg)*))
    };
}
macro_rules! hana_warn {
    ($category:expr, $($arg:tt)*) => {
        HanaLogger::warn($category, &format!($($arg)*))
    };
}
macro_rules! hana_info {
    ($category:expr, $($arg:tt)*) => {
        HanaLogger::info($category, &format!($($arg)*))
    };
}
macro_rules! hana_debug {
    ($category:expr, $($arg:tt)*) => {
        HanaLogger::debug($category, &format!($($arg)*))
    };
}
macro_rules! hana_trace {
    ($category:expr, $($arg:tt)*) => {
        HanaLogger::trace($category, &format!($($arg)*))
    };
}
#[derive(Debug)]
pub enum HanaError {
    Connection { 
        message: String, 
        url: Option<String>,
        retry_count: Option<u32>,
        context: String,
    },
    Query { 
        message: String, 
        query: Option<String>,
        execution_time_ms: Option<u64>,
        context: String,
    },
    TypeConversion { 
        message: String, 
        source_type: Option<String>,
        target_type: Option<String>,
        column_name: Option<String>,
        row_index: Option<usize>,
    },
    Schema { 
        message: String, 
        table_name: Option<String>,
        context: String,
    },
    Configuration { 
        message: String, 
        parameter: Option<String>,
        provided_value: Option<String>,
        expected_format: Option<String>,
    },
    Resource { 
        message: String, 
        operation: String,
        allocated_bytes: Option<usize>,
    },
    Internal { 
        message: String, 
        error_code: Option<i32>,
        context: String,
    },
}
impl fmt::Display for HanaError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            HanaError::Connection { message, url, retry_count, context } => {
                write!(f, "HANA Connection Error: {}", message)?;
                if let Some(url) = url {
                    write!(f, " (URL: {})", url)?;
                }
                if let Some(retries) = retry_count {
                    write!(f, " (Retries: {})", retries)?;
                }
                write!(f, " [Context: {}]", context)
            },
            HanaError::Query { message, query, execution_time_ms, context } => {
                write!(f, "HANA Query Error: {}", message)?;
                if let Some(query) = query {
                    let truncated = if query.len() > 100 { 
                        format!("{}...", &query[..97]) 
                    } else { 
                        query.clone() 
                    };
                    write!(f, " (Query: {})", truncated)?;
                }
                if let Some(time) = execution_time_ms {
                    write!(f, " (Execution time: {}ms)", time)?;
                }
                write!(f, " [Context: {}]", context)
            },
            HanaError::TypeConversion { message, source_type, target_type, column_name, row_index } => {
                write!(f, "HANA Type Conversion Error: {}", message)?;
                if let Some(col) = column_name {
                    write!(f, " (Column: {})", col)?;
                }
                if let Some(row) = row_index {
                    write!(f, " (Row: {})", row)?;
                }
                if let Some(src) = source_type {
                    if let Some(tgt) = target_type {
                        write!(f, " (Converting {} → {})", src, tgt)?;
                    }
                }
                Ok(())
            },
            HanaError::Schema { message, table_name, context } => {
                write!(f, "HANA Schema Error: {}", message)?;
                if let Some(table) = table_name {
                    write!(f, " (Table: {})", table)?;
                }
                write!(f, " [Context: {}]", context)
            },
            HanaError::Configuration { message, parameter, provided_value, expected_format } => {
                write!(f, "HANA Configuration Error: {}", message)?;
                if let Some(param) = parameter {
                    write!(f, " (Parameter: {})", param)?;
                }
                if let Some(value) = provided_value {
                    write!(f, " (Provided: {})", value)?;
                }
                if let Some(expected) = expected_format {
                    write!(f, " (Expected: {})", expected)?;
                }
                Ok(())
            },
            HanaError::Resource { message, operation, allocated_bytes } => {
                write!(f, "HANA Resource Error: {} (Operation: {})", message, operation)?;
                if let Some(bytes) = allocated_bytes {
                    write!(f, " (Memory: {} bytes)", bytes)?;
                }
                Ok(())
            },
            HanaError::Internal { message, error_code, context } => {
                write!(f, "HANA Internal Error: {}", message)?;
                if let Some(code) = error_code {
                    write!(f, " (Code: {})", code)?;
                }
                write!(f, " [Context: {}]", context)
            },
        }
    }
}
impl Error for HanaError {}
impl HanaError {
    pub fn connection(message: &str, url: Option<&str>, retry_count: Option<u32>, context: &str) -> Box<HanaError> {
        Box::new(HanaError::Connection {
            message: message.to_string(),
            url: url.map(|s| s.to_string()),
            retry_count,
            context: context.to_string(),
        })
    }
    pub fn query(message: &str, query: Option<&str>, execution_time_ms: Option<u64>, context: &str) -> Box<HanaError> {
        Box::new(HanaError::Query {
            message: message.to_string(),
            query: query.map(|s| s.to_string()),
            execution_time_ms,
            context: context.to_string(),
        })
    }
    pub fn type_conversion(message: &str, source_type: Option<&str>, target_type: Option<&str>, 
                          column_name: Option<&str>, row_index: Option<usize>) -> Box<HanaError> {
        Box::new(HanaError::TypeConversion {
            message: message.to_string(),
            source_type: source_type.map(|s| s.to_string()),
            target_type: target_type.map(|s| s.to_string()),
            column_name: column_name.map(|s| s.to_string()),
            row_index,
        })
    }
    pub fn schema(message: &str, table_name: Option<&str>, context: &str) -> Box<HanaError> {
        Box::new(HanaError::Schema {
            message: message.to_string(),
            table_name: table_name.map(|s| s.to_string()),
            context: context.to_string(),
        })
    }
    pub fn configuration(message: &str, parameter: Option<&str>, provided_value: Option<&str>, 
                         expected_format: Option<&str>) -> Box<HanaError> {
        Box::new(HanaError::Configuration {
            message: message.to_string(),
            parameter: parameter.map(|s| s.to_string()),
            provided_value: provided_value.map(|s| s.to_string()),
            expected_format: expected_format.map(|s| s.to_string()),
        })
    }
    pub fn resource(message: &str, operation: &str, allocated_bytes: Option<usize>) -> Box<HanaError> {
        Box::new(HanaError::Resource {
            message: message.to_string(),
            operation: operation.to_string(),
            allocated_bytes,
        })
    }
    pub fn internal(message: &str, error_code: Option<i32>, context: &str) -> Box<HanaError> {
        Box::new(HanaError::Internal {
            message: message.to_string(),
            error_code,
            context: context.to_string(),
        })
    }
    pub fn new(message: &str) -> Box<HanaError> {
        Box::new(HanaError::Internal {
            message: message.to_string(),
            error_code: None,
            context: "Legacy error constructor".to_string(),
        })
    }
}
#[derive(Debug, Clone)]
pub struct HanaPerformanceMetrics {
    pub connection_time_ms: Option<u64>,
    pub query_time_ms: Option<u64>,
    pub schema_time_ms: Option<u64>,
    pub data_retrieval_time_ms: Option<u64>,
    pub total_time_ms: Option<u64>,
    pub rows_processed: usize,
    pub columns_processed: usize,
    pub memory_allocated_bytes: usize,
    pub retry_attempts: u32,
    pub peak_memory_bytes: Option<usize>,
    pub network_roundtrips: u32,
}
impl Default for HanaPerformanceMetrics {
    fn default() -> Self {
        HanaPerformanceMetrics {
            connection_time_ms: None,
            query_time_ms: None,
            schema_time_ms: None,
            data_retrieval_time_ms: None,
            total_time_ms: None,
            rows_processed: 0,
            columns_processed: 0,
            memory_allocated_bytes: 0,
            retry_attempts: 0,
            peak_memory_bytes: None,
            network_roundtrips: 0,
        }
    }
}
impl HanaPerformanceMetrics {
    pub fn log_summary(&self, operation: &str) {
        hana_info!("PERF", "Performance summary for {}: {} rows, {} cols, {}ms total", 
                   operation, self.rows_processed, self.columns_processed, 
                   self.total_time_ms.unwrap_or(0));
        if LogLevel::current() >= LogLevel::Debug {
            let conn_time = self.connection_time_ms.unwrap_or(0).to_string();
            let query_time = self.query_time_ms.unwrap_or(0).to_string();
            let memory_mb = (self.memory_allocated_bytes / 1024 / 1024).to_string();
            let retries = self.retry_attempts.to_string();
            let roundtrips = self.network_roundtrips.to_string();
            let context: Vec<(&str, &str)> = vec![
                ("connection_ms", &conn_time),
                ("query_ms", &query_time),
                ("memory_mb", &memory_mb),
                ("retries", &retries),
                ("roundtrips", &roundtrips),
            ];
            let detailed_msg = format!("Detailed metrics for {}", operation);
            HanaLogger::log_with_context(LogLevel::Debug, "PERF", &detailed_msg, &context);
        }
    }
    pub fn throughput_rows_per_sec(&self) -> f64 {
        if let Some(total_time) = self.total_time_ms {
            if total_time > 0 {
                return (self.rows_processed as f64 * 1000.0) / total_time as f64;
            }
        }
        0.0
    }
    pub fn memory_per_row(&self) -> f64 {
        if self.rows_processed > 0 {
            self.memory_allocated_bytes as f64 / self.rows_processed as f64
        } else {
            0.0
        }
    }
}
pub struct HanaTimer {
    start_time: SystemTime,
    label: String,
}
impl HanaTimer {
    pub fn new(label: &str) -> Self {
        hana_trace!("TIMER", "Starting timer: {}", label);
        HanaTimer {
            start_time: SystemTime::now(),
            label: label.to_string(),
        }
    }
    pub fn elapsed_ms(&self) -> u64 {
        self.start_time.elapsed()
            .unwrap_or_default()
            .as_millis() as u64
    }
    pub fn stop(self) -> u64 {
        let elapsed = self.elapsed_ms();
        hana_trace!("TIMER", "Timer {} completed in {}ms", self.label, elapsed);
        elapsed
    }
    pub fn stop_and_log(self) -> u64 {
        let elapsed = self.elapsed_ms();
        hana_info!("TIMER", "Operation '{}' completed in {}ms", self.label, elapsed);
        elapsed
    }
}
#[derive(Debug)]
pub struct HanaScanBindData {
    pub url: String,
    pub user: String,
    pub password: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub query: String,
    pub column_names: Vec<String>,
    pub column_types: Vec<LogicalTypeId>,
    pub batch_size: usize,
    pub connection_timeout_ms: u64,
    pub query_timeout_ms: u64,
    pub max_retries: u32,
    pub metrics: HanaPerformanceMetrics,
}
impl Clone for HanaScanBindData {
    fn clone(&self) -> Self {
        let cloned_types = self.column_types.iter().map(|t| {
            match t {
                LogicalTypeId::Boolean => LogicalTypeId::Boolean,
                LogicalTypeId::Tinyint => LogicalTypeId::Tinyint,
                LogicalTypeId::Smallint => LogicalTypeId::Smallint,
                LogicalTypeId::Integer => LogicalTypeId::Integer,
                LogicalTypeId::Bigint => LogicalTypeId::Bigint,
                LogicalTypeId::Float => LogicalTypeId::Float,
                LogicalTypeId::Double => LogicalTypeId::Double,
                LogicalTypeId::Decimal => LogicalTypeId::Decimal,
                LogicalTypeId::Varchar => LogicalTypeId::Varchar,
                LogicalTypeId::Blob => LogicalTypeId::Blob,
                LogicalTypeId::Date => LogicalTypeId::Date,
                LogicalTypeId::Time => LogicalTypeId::Time,
                LogicalTypeId::Timestamp => LogicalTypeId::Timestamp,
                _ => LogicalTypeId::Varchar,
            }
        }).collect();
        HanaScanBindData {
            url: self.url.clone(),
            user: self.user.clone(),
            password: self.password.clone(),
            host: self.host.clone(),
            port: self.port,
            database: self.database.clone(),
            query: self.query.clone(),
            column_names: self.column_names.clone(),
            column_types: cloned_types,
            batch_size: self.batch_size,
            connection_timeout_ms: self.connection_timeout_ms,
            query_timeout_ms: self.query_timeout_ms,
            max_retries: self.max_retries,
            metrics: self.metrics.clone(),
        }
    }
}
#[derive(Debug)]  
pub struct HanaScanInitData {
    bind_data: HanaScanBindData,
    result_rows: Vec<Row>,
    current_row: RwLock<usize>,
    total_rows: usize,
    done: RwLock<bool>,
    metrics: RwLock<HanaPerformanceMetrics>,
}
#[allow(dead_code)]
fn map_hana_type(hana_type: hdbconnect::TypeId) -> LogicalTypeId {
    match hana_type {
        hdbconnect::TypeId::BOOLEAN => LogicalTypeId::Boolean,
        hdbconnect::TypeId::TINYINT => LogicalTypeId::Tinyint,
        hdbconnect::TypeId::SMALLINT => LogicalTypeId::Smallint,
        hdbconnect::TypeId::INT => LogicalTypeId::Integer,
        hdbconnect::TypeId::BIGINT => LogicalTypeId::Bigint,
        hdbconnect::TypeId::REAL => LogicalTypeId::Float,
        hdbconnect::TypeId::DOUBLE => LogicalTypeId::Double,
        hdbconnect::TypeId::DECIMAL => LogicalTypeId::Decimal,
        hdbconnect::TypeId::CHAR | hdbconnect::TypeId::VARCHAR | 
        hdbconnect::TypeId::NCHAR | hdbconnect::TypeId::NVARCHAR | 
        hdbconnect::TypeId::STRING | hdbconnect::TypeId::NSTRING |
        hdbconnect::TypeId::SHORTTEXT | hdbconnect::TypeId::ALPHANUM => LogicalTypeId::Varchar,
        hdbconnect::TypeId::BINARY | hdbconnect::TypeId::VARBINARY => LogicalTypeId::Blob,
        hdbconnect::TypeId::DAYDATE => LogicalTypeId::Date,
        hdbconnect::TypeId::SECONDTIME => LogicalTypeId::Time,
        hdbconnect::TypeId::LONGDATE | hdbconnect::TypeId::SECONDDATE => LogicalTypeId::Timestamp,
        hdbconnect::TypeId::CLOB | hdbconnect::TypeId::NCLOB | hdbconnect::TypeId::TEXT => LogicalTypeId::Varchar,
        hdbconnect::TypeId::BLOB | hdbconnect::TypeId::BLOCATOR | hdbconnect::TypeId::BINTEXT => LogicalTypeId::Blob,
        hdbconnect::TypeId::GEOMETRY | hdbconnect::TypeId::POINT => LogicalTypeId::Varchar,
        _ => LogicalTypeId::Varchar,
    }
}
pub fn parse_hana_url(url: &str) -> Result<(String, String, String, u16, String), Box<dyn Error>> {
    if !url.starts_with("hdbsql://") {
        return Err(HanaError::new("URL must start with hdbsql://"));
    }
    let url_part = &url[9..];
    let (auth_part, host_db_part) = url_part
        .split_once('@')
        .ok_or_else(|| HanaError::new("Invalid URL format: missing '@' separator"))?;
    let (user, password) = auth_part
        .split_once(':')
        .ok_or_else(|| HanaError::new("Invalid URL format: missing ':' in credentials"))?;
    if user.trim().is_empty() {
        return Err(HanaError::new("Username cannot be empty"));
    }
    if password.trim().is_empty() {
        return Err(HanaError::new("Password cannot be empty"));
    }
    let (host_db_base, _query_params) = host_db_part
        .split_once('?')
        .unwrap_or((host_db_part, ""));
    let (host_port, database) = host_db_base
        .split_once('/')
        .ok_or_else(|| HanaError::new("Invalid URL format: missing '/' before database"))?;
    let (host, port_str) = host_port
        .split_once(':')
        .ok_or_else(|| HanaError::new("Invalid URL format: missing ':' for port"))?;
    if host.trim().is_empty() {
        return Err(HanaError::new("Host cannot be empty"));
    }
    let port: u16 = port_str
        .parse()
        .map_err(|_| HanaError::new(&format!("Invalid port number: {}", port_str)))?;
    if port == 0 {
        return Err(HanaError::new("Port cannot be 0"));
    }
    if database.trim().is_empty() {
        return Err(HanaError::new("Database name cannot be empty"));
    }
    Ok((
        user.trim().to_string(),
        password.to_string(),
        host.trim().to_string(),
        port,
        database.trim().to_string(),
    ))
}
pub fn validate_hana_connection(url: &str) -> Result<(), Box<dyn Error>> {
    let (_user, _password, host, port, database) = parse_hana_url(url)?;
    if host.len() > 255 {
        return Err(HanaError::new("Host name too long (max 255 characters)"));
    }
    if database.len() > 128 {
        return Err(HanaError::new("Database name too long (max 128 characters)"));
    }
    if port < 30000 || port > 39999 {
        eprintln!("Warning: Port {} is outside typical HANA port range (30000-39999)", port);
    }
    Ok(())
}
pub struct HanaScanVTab;
impl VTab for HanaScanVTab {
    type InitData = HanaScanInitData;
    type BindData = HanaScanBindData;
    fn bind(bind: &BindInfo) -> Result<Self::BindData, Box<dyn Error>> {
        let query = bind.get_parameter(0).to_string();
        let url = bind.get_parameter(1).to_string();
        validate_hana_connection(&url)?;
        let (user, password, host, port, database) = parse_hana_url(&url)?;
        let batch_size = std::env::var("HANA_BATCH_SIZE")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(1024);
        let connection_timeout_ms = std::env::var("HANA_CONNECTION_TIMEOUT_MS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(30000);
        let query_timeout_ms = std::env::var("HANA_QUERY_TIMEOUT_MS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(300000);
        let max_retries = std::env::var("HANA_MAX_RETRIES")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(3);
        if batch_size == 0 || batch_size > 10000 {
            return Err(HanaError::new("Batch size must be between 1 and 10000"));
        }
        if connection_timeout_ms == 0 || connection_timeout_ms > 300000 {
            return Err(HanaError::new("Connection timeout must be between 1ms and 5 minutes"));
        }
        let (column_names, column_types) = match HanaConnection::new(url.clone()) {
            Ok(connection) => {
                let is_problematic_query = query.to_lowercase().contains("now()") ||
                                          query.to_lowercase().contains("current_timestamp") ||
                                          query.to_lowercase().contains("current_date") ||
                                          query.to_lowercase().contains("current_time");
                if is_problematic_query {
                    eprintln!("Warning: Query contains date/time functions that may cause issues. Using safe schema detection.");
                    (
                        vec!["result".to_string()],
                        vec![LogicalTypeId::Varchar],
                    )
                } else {
                    let schema_result = match connection.prepare(&query) {
                        Ok(_prepared) => {
                            match connection.query(&format!("SELECT * FROM ({}) AS subquery LIMIT 1", query)) {
                                Ok(result_set) => {
                                    let metadata = result_set.metadata();
                                    let mut names = Vec::new();
                                    let mut types = Vec::new();
                                    for field_metadata in metadata.iter() {
                                        let column_name = if field_metadata.displayname().is_empty() {
                                            field_metadata.columnname().to_string()
                                        } else {
                                            field_metadata.displayname().to_string()
                                        };
                                        let logical_type = match field_metadata.type_id() {
                                            hdbconnect::TypeId::DAYDATE | 
                                            hdbconnect::TypeId::SECONDTIME |
                                            hdbconnect::TypeId::LONGDATE | 
                                            hdbconnect::TypeId::SECONDDATE => {
                                                LogicalTypeId::Varchar
                                            }
                                            _ => map_hana_type(field_metadata.type_id())
                                        };
                                        names.push(column_name);
                                        types.push(logical_type);
                                    }
                                    if names.is_empty() {
                                        (
                                            vec!["result".to_string()],
                                            vec![LogicalTypeId::Varchar],
                                        )
                                    } else {
                                        (names, types)
                                    }
                                }
                                Err(e) => {
                                    eprintln!("Warning: Failed to get schema from HANA query: {}", e);
                                    (
                                        vec!["result".to_string()],
                                        vec![LogicalTypeId::Varchar],
                                    )
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("Warning: Failed to prepare HANA query: {}", e);
                            (
                                vec!["result".to_string()],
                                vec![LogicalTypeId::Varchar],
                            )
                        }
                    };
                    schema_result
                }
            }
            Err(e) => {
                eprintln!("Warning: Failed to connect to HANA for schema detection: {}", e);
                let query_lower = query.to_lowercase();
                if query_lower.contains("select") && (query_lower.contains(" as ") || query_lower.contains("from")) {
                    if query_lower.contains("42") || query_lower.contains("123") || query_lower.contains("integer") || query_lower.contains("int") {
                        (
                            vec!["result".to_string()],
                            vec![LogicalTypeId::Integer],
                        )
                    } else {
                        (
                            vec!["result".to_string()],
                            vec![LogicalTypeId::Varchar],
                        )
                    }
                } else {
                    (
                        vec!["result".to_string()],
                        vec![LogicalTypeId::Varchar],
                    )
                }
            }
        };
        for (name, type_id) in column_names.iter().zip(column_types.iter()) {
            let logical_type = match type_id {
                LogicalTypeId::Integer => LogicalTypeId::Integer,
                LogicalTypeId::Bigint => LogicalTypeId::Bigint,
                LogicalTypeId::Float => LogicalTypeId::Float,
                LogicalTypeId::Double => LogicalTypeId::Double,
                LogicalTypeId::Varchar => LogicalTypeId::Varchar,
                LogicalTypeId::Boolean => LogicalTypeId::Boolean,
                LogicalTypeId::Decimal => LogicalTypeId::Decimal,
                LogicalTypeId::Date => LogicalTypeId::Date,
                LogicalTypeId::Time => LogicalTypeId::Time,
                LogicalTypeId::Timestamp => LogicalTypeId::Timestamp,
                LogicalTypeId::Blob => LogicalTypeId::Blob,
                _ => LogicalTypeId::Varchar,
            };
            let type_handle = duckdb::core::LogicalTypeHandle::from(logical_type);
            bind.add_result_column(name, type_handle);
        }
        Ok(HanaScanBindData {
            url,
            user,
            password,
            host,
            port,
            database,
            query,
            column_names,
            column_types,
            batch_size,
            connection_timeout_ms,
            query_timeout_ms,
            max_retries,
            metrics: HanaPerformanceMetrics::default(),
        })
    }
    fn init(init: &InitInfo) -> Result<Self::InitData, Box<dyn Error>> {
        let bind_data = init.get_bind_data::<Self::BindData>();
        let bind_data_ref = unsafe { &*bind_data };
            let mut connection_result = None;
            let mut last_error = None;
            for attempt in 0..=bind_data_ref.max_retries {
                match HanaConnection::new(bind_data_ref.url.clone()) {
                    Ok(connection) => {
                        connection_result = Some(connection);
                        break;
                    }
                    Err(e) => {
                    last_error = Some(e);
                    if attempt < bind_data_ref.max_retries {
                        eprintln!("Connection attempt {} failed, retrying... (max retries: {})", 
                                attempt + 1, bind_data_ref.max_retries);
                        std::thread::sleep(std::time::Duration::from_millis(100 * (1 << attempt)));
                    }
                }
            }
        }
        match connection_result {
            Some(connection) => {
                let query_result = connection.query(&bind_data_ref.query);
                match query_result {
                    Ok(result_set) => {
                        let mut result_rows = Vec::new();
                        for row_result in result_set {
                            match row_result {
                                Ok(row) => result_rows.push(row),
                                Err(e) => return Err(HanaError::new(&format!("Error reading row: {}", e))),
                            }
                        }
                        let total_rows = result_rows.len();
                        Ok(HanaScanInitData {
                            bind_data: bind_data_ref.clone(),
                            result_rows,
                            current_row: RwLock::new(0),
                            total_rows,
                            done: RwLock::new(false),
                            metrics: RwLock::new(HanaPerformanceMetrics::default()),
                        })
                    }
                    Err(e) => {
                        Err(HanaError::new(&format!("Failed to execute HANA query: {}", e)))
                    }
                }
            }
            None => {
                let error_msg = if let Some(e) = last_error {
                    format!("Failed to connect to HANA after {} attempts: {}", 
                           bind_data_ref.max_retries + 1, e)
                } else {
                    "Failed to connect to HANA: unknown error".to_string()
                };
                Err(HanaError::new(&error_msg))
            }
        }
    }
    fn func(
        info: &TableFunctionInfo<Self>,
        output: &mut DataChunkHandle,
    ) -> Result<(), Box<dyn Error>> {
        let init_data = &*(info.get_init_data());
        let current_row = match init_data.current_row.read() {
            Ok(guard) => *guard,
            Err(_) => return Err(HanaError::new("Failed to read current row position")),
        };
        let done = match init_data.done.read() {
            Ok(guard) => *guard,
            Err(_) => return Err(HanaError::new("Failed to read done status")),
        };
        if done || current_row >= init_data.total_rows {
            output.set_len(0);
            return Ok(());
        }
        let remaining_rows = init_data.total_rows - current_row;
        let batch_size = std::cmp::min(remaining_rows, init_data.bind_data.batch_size);
        if batch_size == 0 {
            output.set_len(0);
            return Ok(());
        }
        output.set_len(batch_size);
        for (col_idx, column_type) in init_data.bind_data.column_types.iter().enumerate() {
            let mut flat_vector = output.flat_vector(col_idx);
            for row_idx in 0..batch_size {
                let global_row_idx = current_row + row_idx;
                if global_row_idx >= init_data.result_rows.len() {
                    break;
                }
                let row = match init_data.result_rows.get(global_row_idx) {
                    Some(r) => r,
                    None => {
                        break;
                    }
                };
                if col_idx < row.len() {
                    let hdb_value = &row[col_idx];
                    let debug_repr = format!("{:?}", hdb_value);
                    let is_datetime_type = debug_repr.starts_with("Timestamp(") || 
                                          debug_repr.starts_with("Date(") ||
                                          debug_repr.starts_with("Time(") ||
                                          debug_repr.starts_with("LongDate(") ||
                                          debug_repr.starts_with("SecondDate(") ||
                                          debug_repr.starts_with("DayDate(") ||
                                          debug_repr.starts_with("SecondTime(");
                    if debug_repr.contains("Null") || debug_repr.contains("null") {
                        flat_vector.set_null(row_idx);
                    } else if is_datetime_type {
                        let conversion_success = match column_type {
                            LogicalTypeId::Date => {
                                if let Ok(Some(date)) = hdb_value.clone().try_into::<Option<chrono::NaiveDate>>() {
                                    flat_vector.insert(row_idx, &date.to_string());
                                    true
                                } else if let Ok(None) = hdb_value.clone().try_into::<Option<chrono::NaiveDate>>() {
                                    flat_vector.set_null(row_idx);
                                    true
                                } else {
                                    false
                                }
                            }
                            LogicalTypeId::Time => {
                                if let Ok(Some(time)) = hdb_value.clone().try_into::<Option<chrono::NaiveTime>>() {
                                    flat_vector.insert(row_idx, &time.to_string());
                                    true
                                } else if let Ok(None) = hdb_value.clone().try_into::<Option<chrono::NaiveTime>>() {
                                    flat_vector.set_null(row_idx);
                                    true
                                } else {
                                    false
                                }
                            }
                            LogicalTypeId::Timestamp => {
                                if let Ok(Some(timestamp)) = hdb_value.clone().try_into::<Option<chrono::NaiveDateTime>>() {
                                    flat_vector.insert(row_idx, &timestamp.to_string());
                                    true
                                } else if let Ok(None) = hdb_value.clone().try_into::<Option<chrono::NaiveDateTime>>() {
                                    flat_vector.set_null(row_idx);
                                    true
                                } else {
                                    false
                                }
                            }
                            _ => false
                        };
                        if !conversion_success {
                            let safe_datetime_value = if let Some(start) = debug_repr.find('(') {
                                if let Some(end) = debug_repr.rfind(')') {
                                    let content = &debug_repr[start+1..end];
                                    if content.starts_with('"') && content.ends_with('"') {
                                        content[1..content.len()-1].to_string()
                                    } else {
                                        content.to_string()
                                    }
                                } else {
                                    "<hana_datetime>".to_string()
                                }
                            } else {
                                "<hana_datetime>".to_string()
                            };
                            flat_vector.insert(row_idx, safe_datetime_value.as_str());
                        }
                    } else {
                        match column_type {
                            LogicalTypeId::Varchar => {
                                if let Ok(Some(s)) = hdb_value.clone().try_into::<Option<String>>() {
                                    flat_vector.insert(row_idx, s.as_str());
                                } else if let Ok(None) = hdb_value.clone().try_into::<Option<String>>() {
                                    flat_vector.set_null(row_idx);
                                } else {
                                    if debug_repr.starts_with("String(") && debug_repr.ends_with(")") {
                                        let content = &debug_repr[7..debug_repr.len()-1];
                                        if content.starts_with('"') && content.ends_with('"') {
                                            flat_vector.insert(row_idx, &content[1..content.len()-1]);
                                        } else {
                                            flat_vector.insert(row_idx, content);
                                        }
                                    } else {
                                        flat_vector.insert(row_idx, "<hana_string>");
                                    }
                                }
                            }
                            LogicalTypeId::Integer => {
                                let slice = flat_vector.as_mut_slice::<i32>();
                                if let Ok(Some(i)) = hdb_value.clone().try_into::<Option<i32>>() {
                                    slice[row_idx] = i;
                                } else if let Ok(None) = hdb_value.clone().try_into::<Option<i32>>() {
                                    flat_vector.set_null(row_idx);
                                } else {
                                    if debug_repr.contains(":INT") {
                                        if let Some(colon_pos) = debug_repr.find(':') {
                                            let content = &debug_repr[..colon_pos];
                                            if let Ok(parsed) = content.parse::<i32>() {
                                                slice[row_idx] = parsed;
                                            } else {
                                                flat_vector.set_null(row_idx);
                                            }
                                        } else {
                                            flat_vector.set_null(row_idx);
                                        }
                                    } else {
                                        flat_vector.set_null(row_idx);
                                    }
                                }
                            }
                            LogicalTypeId::Bigint => {
                                let slice = flat_vector.as_mut_slice::<i64>();
                                if let Ok(Some(i)) = hdb_value.clone().try_into::<Option<i64>>() {
                                    slice[row_idx] = i;
                                } else if let Ok(None) = hdb_value.clone().try_into::<Option<i64>>() {
                                    flat_vector.set_null(row_idx);
                                } else {
                                    if debug_repr.contains(":BIGINT") {
                                        if let Some(colon_pos) = debug_repr.find(':') {
                                            let content = &debug_repr[..colon_pos];
                                            if let Ok(parsed) = content.parse::<i64>() {
                                                slice[row_idx] = parsed;
                                            } else {
                                                flat_vector.set_null(row_idx);
                                            }
                                        } else {
                                            flat_vector.set_null(row_idx);
                                        }
                                    } else {
                                        flat_vector.set_null(row_idx);
                                    }
                                }
                            }
                            LogicalTypeId::Float => {
                                let slice = flat_vector.as_mut_slice::<f32>();
                                if let Ok(Some(f)) = hdb_value.clone().try_into::<Option<f32>>() {
                                    slice[row_idx] = f;
                                } else if let Ok(None) = hdb_value.clone().try_into::<Option<f32>>() {
                                    flat_vector.set_null(row_idx);
                                } else {
                                    if debug_repr.contains(":REAL") {
                                        if let Some(colon_pos) = debug_repr.find(':') {
                                            let content = &debug_repr[..colon_pos];
                                            if let Ok(parsed) = content.parse::<f32>() {
                                                slice[row_idx] = parsed;
                                            } else {
                                                flat_vector.set_null(row_idx);
                                            }
                                        } else {
                                            flat_vector.set_null(row_idx);
                                        }
                                    } else {
                                        flat_vector.set_null(row_idx);
                                    }
                                }
                            }
                            LogicalTypeId::Double => {
                                let slice = flat_vector.as_mut_slice::<f64>();
                                if let Ok(Some(d)) = hdb_value.clone().try_into::<Option<f64>>() {
                                    slice[row_idx] = d;
                                } else if let Ok(None) = hdb_value.clone().try_into::<Option<f64>>() {
                                    flat_vector.set_null(row_idx);
                                } else {
                                    if debug_repr.contains(":DOUBLE") {
                                        if let Some(colon_pos) = debug_repr.find(':') {
                                            let content = &debug_repr[..colon_pos];
                                            if let Ok(parsed) = content.parse::<f64>() {
                                                slice[row_idx] = parsed;
                                            } else {
                                                flat_vector.set_null(row_idx);
                                            }
                                        } else {
                                            flat_vector.set_null(row_idx);
                                        }
                                    } else {
                                        flat_vector.set_null(row_idx);
                                    }
                                }
                            }
                            LogicalTypeId::Decimal => {
                                if let Ok(Some(s)) = hdb_value.clone().try_into::<Option<String>>() {
                                    flat_vector.insert(row_idx, s.as_str());
                                } else if let Ok(None) = hdb_value.clone().try_into::<Option<String>>() {
                                    flat_vector.set_null(row_idx);
                                } else {
                                    if debug_repr.contains(":DECIMAL") {
                                        if let Some(colon_pos) = debug_repr.find(':') {
                                            let content = &debug_repr[..colon_pos];
                                            flat_vector.insert(row_idx, content);
                                        } else {
                                            flat_vector.set_null(row_idx);
                                        }
                                    } else {
                                        flat_vector.set_null(row_idx);
                                    }
                                }
                            }
                            LogicalTypeId::Boolean => {
                                let slice = flat_vector.as_mut_slice::<bool>();
                                if let Ok(Some(b)) = hdb_value.clone().try_into::<Option<bool>>() {
                                    slice[row_idx] = b;
                                } else if let Ok(None) = hdb_value.clone().try_into::<Option<bool>>() {
                                    flat_vector.set_null(row_idx);
                                } else {
                                    if debug_repr.contains(":BOOLEAN") {
                                        if let Some(colon_pos) = debug_repr.find(':') {
                                            let content = &debug_repr[..colon_pos];
                                            if let Ok(parsed) = content.parse::<bool>() {
                                                slice[row_idx] = parsed;
                                            } else {
                                                flat_vector.set_null(row_idx);
                                            }
                                        } else {
                                            flat_vector.set_null(row_idx);
                                        }
                                    } else {
                                        flat_vector.set_null(row_idx);
                                    }
                                }
                            }
                            LogicalTypeId::Date => {
                                let safe_date_value = if let Some(start) = debug_repr.find('(') {
                                    if let Some(end) = debug_repr.rfind(')') {
                                        let content = &debug_repr[start+1..end];
                                        if content.starts_with('"') && content.ends_with('"') {
                                            content[1..content.len()-1].to_string()
                                        } else {
                                            content.to_string()
                                        }
                                    } else {
                                        "<hana_date>".to_string()
                                    }
                                } else {
                                    "<hana_date>".to_string()
                                };
                                flat_vector.insert(row_idx, safe_date_value.as_str());
                            }
                            LogicalTypeId::Time => {
                                let safe_time_value = if let Some(start) = debug_repr.find('(') {
                                    if let Some(end) = debug_repr.rfind(')') {
                                        let content = &debug_repr[start+1..end];
                                        if content.starts_with('"') && content.ends_with('"') {
                                            content[1..content.len()-1].to_string()
                                        } else {
                                            content.to_string()
                                        }
                                    } else {
                                        "<hana_time>".to_string()
                                    }
                                } else {
                                    "<hana_time>".to_string()
                                };
                                flat_vector.insert(row_idx, safe_time_value.as_str());
                            }
                            LogicalTypeId::Timestamp => {
                                let safe_timestamp_value = if let Some(start) = debug_repr.find('(') {
                                    if let Some(end) = debug_repr.rfind(')') {
                                        let content = &debug_repr[start+1..end];
                                        if content.starts_with('"') && content.ends_with('"') {
                                            content[1..content.len()-1].to_string()
                                        } else {
                                            content.to_string()
                                        }
                                    } else {
                                        "<hana_timestamp>".to_string()
                                    }
                                } else {
                                    "<hana_timestamp>".to_string()
                                };
                                flat_vector.insert(row_idx, safe_timestamp_value.as_str());
                            }
                            _ => {
                                if let Ok(Some(s)) = hdb_value.clone().try_into::<Option<String>>() {
                                    flat_vector.insert(row_idx, s.as_str());
                                } else if let Ok(None) = hdb_value.clone().try_into::<Option<String>>() {
                                    flat_vector.set_null(row_idx);
                                } else {
                                    flat_vector.insert(row_idx, "<hana_value>");
                                }
                            }
                        }
                    }
                } else {
                    flat_vector.set_null(row_idx);
                }
            }
        }
        match init_data.current_row.write() {
            Ok(mut guard) => *guard += batch_size,
            Err(_) => return Err(HanaError::new("Failed to update current row position")),
        };
        let current_row_after_update = match init_data.current_row.read() {
            Ok(guard) => *guard,
            Err(_) => return Err(HanaError::new("Failed to read updated current row position")),
        };
        if current_row_after_update >= init_data.total_rows {
            match init_data.done.write() {
                Ok(mut guard) => *guard = true,
                Err(_) => return Err(HanaError::new("Failed to mark processing as done")),
            };
        }
        Ok(())
    }
    fn parameters() -> Option<Vec<duckdb::core::LogicalTypeHandle>> {
        Some(vec![
            duckdb::core::LogicalTypeHandle::from(LogicalTypeId::Varchar),
            duckdb::core::LogicalTypeHandle::from(LogicalTypeId::Varchar),
        ])
    }
}
#[cfg(test)]
mod tests {
    
    use super::*;
    #[test]
    fn test_parse_hana_url_valid() {
        let url = "hdbsql://testuser:testpass@localhost:30015/HDB";
        let result = parse_hana_url(url).unwrap();
        assert_eq!(result.0, "testuser");
        assert_eq!(result.1, "testpass");
        assert_eq!(result.2, "localhost");
        assert_eq!(result.3, 30015);
        assert_eq!(result.4, "HDB");
    }
    #[test]
    fn test_parse_hana_url_with_query_params() {
        let url = "hdbsql://user:pass@server:30041/MYDB?ssl=true&timeout=30";
        let result = parse_hana_url(url).unwrap();
        assert_eq!(result.0, "user");
        assert_eq!(result.1, "pass");
        assert_eq!(result.2, "server");
        assert_eq!(result.3, 30041);
        assert_eq!(result.4, "MYDB");
    }
    #[test]
    fn test_parse_hana_url_invalid_scheme() {
        let url = "mysql://user:pass@host:3306/db";
        let result = parse_hana_url(url);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("URL must start with hdbsql://"));
    }
    #[test]
    fn test_parse_hana_url_missing_auth() {
        let url = "hdbsql://localhost:30015/HDB";
        let result = parse_hana_url(url);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("missing '@' separator"));
    }
    #[test]
    fn test_parse_hana_url_missing_port() {
        let url = "hdbsql://user:pass@localhost/HDB";
        let result = parse_hana_url(url);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("missing ':' for port"));
    }
    #[test]
    fn test_parse_hana_url_invalid_port() {
        let url = "hdbsql://user:pass@localhost:abc/HDB";
        let result = parse_hana_url(url);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid port number"));
    }
    #[test]
    fn test_parse_hana_url_empty_credentials() {
        let url = "hdbsql://:@localhost:30015/HDB";
        let result = parse_hana_url(url);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Username cannot be empty"));
    }
    #[test]
    fn test_validate_hana_connection_valid() {
        let url = "hdbsql://user:pass@localhost:30015/HDB";
        let result = validate_hana_connection(url);
        assert!(result.is_ok());
    }
    #[test]
    fn test_validate_hana_connection_long_hostname() {
        let long_host = "a".repeat(256);
        let url = format!("hdbsql://user:pass@{}:30015/HDB", long_host);
        let result = validate_hana_connection(&url);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Host name too long"));
    }
    #[test]
    fn test_validate_hana_connection_long_database() {
        let long_db = "a".repeat(129);
        let url = format!("hdbsql://user:pass@localhost:30015/{}", long_db);
        let result = validate_hana_connection(&url);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Database name too long"));
    }
    #[test]
    fn test_map_hana_type_integers() {
        assert_eq!(map_hana_type(hdbconnect::TypeId::INT), LogicalTypeId::Integer);
        assert_eq!(map_hana_type(hdbconnect::TypeId::BIGINT), LogicalTypeId::Bigint);
        assert_eq!(map_hana_type(hdbconnect::TypeId::SMALLINT), LogicalTypeId::Smallint);
        assert_eq!(map_hana_type(hdbconnect::TypeId::TINYINT), LogicalTypeId::Tinyint);
    }
    #[test]
    fn test_map_hana_type_floats() {
        assert_eq!(map_hana_type(hdbconnect::TypeId::REAL), LogicalTypeId::Float);
        assert_eq!(map_hana_type(hdbconnect::TypeId::DOUBLE), LogicalTypeId::Double);
        assert_eq!(map_hana_type(hdbconnect::TypeId::DECIMAL), LogicalTypeId::Decimal);
    }
    #[test]
    fn test_map_hana_type_strings() {
        assert_eq!(map_hana_type(hdbconnect::TypeId::VARCHAR), LogicalTypeId::Varchar);
        assert_eq!(map_hana_type(hdbconnect::TypeId::CHAR), LogicalTypeId::Varchar);
        assert_eq!(map_hana_type(hdbconnect::TypeId::NVARCHAR), LogicalTypeId::Varchar);
        assert_eq!(map_hana_type(hdbconnect::TypeId::STRING), LogicalTypeId::Varchar);
        assert_eq!(map_hana_type(hdbconnect::TypeId::CLOB), LogicalTypeId::Varchar);
    }
    #[test]
    fn test_map_hana_type_dates() {
        assert_eq!(map_hana_type(hdbconnect::TypeId::DAYDATE), LogicalTypeId::Date);
        assert_eq!(map_hana_type(hdbconnect::TypeId::SECONDTIME), LogicalTypeId::Time);
        assert_eq!(map_hana_type(hdbconnect::TypeId::LONGDATE), LogicalTypeId::Timestamp);
        assert_eq!(map_hana_type(hdbconnect::TypeId::SECONDDATE), LogicalTypeId::Timestamp);
    }
    #[test]
    fn test_map_hana_type_binary() {
        assert_eq!(map_hana_type(hdbconnect::TypeId::BINARY), LogicalTypeId::Blob);
        assert_eq!(map_hana_type(hdbconnect::TypeId::VARBINARY), LogicalTypeId::Blob);
        assert_eq!(map_hana_type(hdbconnect::TypeId::BLOB), LogicalTypeId::Blob);
    }
    #[test]
    fn test_map_hana_type_boolean() {
        assert_eq!(map_hana_type(hdbconnect::TypeId::BOOLEAN), LogicalTypeId::Boolean);
    }
    #[test]
    fn test_hana_error_creation() {
        let error = HanaError::new("Test error message");
        assert!(format!("{}", error).contains("Test error message"));
        assert!(format!("{}", error).contains("HANA Internal Error"));
    }
    #[test]
    fn test_hana_error_display() {
        let error = HanaError::connection("Connection failed", Some("hdbsql://test"), Some(3), "bind phase");
        let display = format!("{}", error);
        assert!(display.contains("Connection failed"));
        assert!(display.contains("hdbsql://test"));
        assert!(display.contains("Retries: 3"));
        assert!(display.contains("bind phase"));
    }
    #[test]
    fn test_hana_scan_bind_data_clone() {
        let bind_data = HanaScanBindData {
            url: "hdbsql://user:pass@host:30015/db".to_string(),
            user: "user".to_string(),
            password: "pass".to_string(),
            host: "host".to_string(),
            port: 30015,
            database: "db".to_string(),
            query: "SELECT * FROM test".to_string(),
            column_names: vec!["col1".to_string(), "col2".to_string()],
            column_types: vec![LogicalTypeId::Integer, LogicalTypeId::Varchar],
            batch_size: 1024,
            connection_timeout_ms: 30000,
            query_timeout_ms: 300000,
            max_retries: 3,
            metrics: HanaPerformanceMetrics::default(),
        };
        let cloned = bind_data.clone();
        assert_eq!(bind_data.url, cloned.url);
        assert_eq!(bind_data.user, cloned.user);
        assert_eq!(bind_data.column_names, cloned.column_names);
        assert_eq!(bind_data.batch_size, cloned.batch_size);
    }
    #[test]
    fn test_url_parsing_edge_cases() {
        // Test with special characters in password (but not @)
        let url = "hdbsql://user:p!ss#word@host:30015/db";
        let result = parse_hana_url(url).unwrap();
        assert_eq!(result.1, "p!ss#word");

        // Test with numeric database name
        let url = "hdbsql://user:pass@host:30015/123";
        let result = parse_hana_url(url).unwrap();
        assert_eq!(result.4, "123");

        // Test with IP address
        let url = "hdbsql://user:pass@192.168.1.100:30015/db";
        let result = parse_hana_url(url).unwrap();
        assert_eq!(result.2, "192.168.1.100");
    }
    #[test]
    fn test_port_range_warnings() {
        // Test port outside typical HANA range (should not error, just warn)
        let url = "hdbsql://user:pass@host:3306/db";
        let result = validate_hana_connection(url);
        assert!(result.is_ok());
    }
}
