//! Type definitions and data structures for the ChDB extension

use duckdb::core::LogicalTypeId;
use std::error::Error;
use std::fmt;
use std::sync::{RwLock, Arc, Mutex, OnceLock};
use std::env;
use std::time::{SystemTime, UNIX_EPOCH};
use chdb_rust::session::Session;

#[macro_export]
macro_rules! chdb_debug {
    ($category:expr, $msg:expr) => {
        $crate::types::ChdbLogger::log($crate::types::LogLevel::Debug, $category, $msg)
    };
    ($category:expr, $fmt:expr, $($arg:tt)*) => {
        $crate::types::ChdbLogger::log($crate::types::LogLevel::Debug, $category, &format!($fmt, $($arg)*))
    };
}

pub static GLOBAL_SESSION: OnceLock<Arc<Mutex<Session>>> = OnceLock::new();

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
        env::var("CHDB_LOG_LEVEL")
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

pub struct ChdbLogger;

impl ChdbLogger {
    pub fn log(level: LogLevel, category: &str, message: &str) {
        if level <= LogLevel::current() {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis();
            
            eprintln!("[{}][{}][{}] {}", timestamp, level.as_str(), category, message);
        }
    }
}

#[derive(Debug)]
pub struct ChdbError {
    message: String,
}

impl ChdbError {
    pub fn new(message: &str) -> Self {
        Self {
            message: message.to_string(),
        }
    }
}

impl fmt::Display for ChdbError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl Error for ChdbError {}

#[derive(Debug, Clone, Default)]
pub struct ChdbPerformanceMetrics {
    pub queries_executed: u64,
    pub total_execution_time_ms: u64,
    pub last_execution_time_ms: u64,
    pub average_execution_time_ms: u64,
    pub errors_count: u64,
}

impl ChdbPerformanceMetrics {
    pub fn new() -> Self {
        Default::default()
    }

    pub fn record_query(&mut self, execution_time_ms: u64, success: bool) {
        self.queries_executed += 1;
        self.total_execution_time_ms += execution_time_ms;
        self.last_execution_time_ms = execution_time_ms;
        
        if self.queries_executed > 0 {
            self.average_execution_time_ms = self.total_execution_time_ms / self.queries_executed;
        }
        
        if !success {
            self.errors_count += 1;
        }
    }
}

#[derive(Debug)]
pub struct ChdbScanBindData {
    pub query: String,
    pub session_path: Option<String>,
    pub batch_size: usize,
    pub column_names: Vec<String>,
    pub column_types: Vec<LogicalTypeId>,
}

#[derive(Debug)]
pub struct ChdbScanInitData {
    pub batch_size: usize,
    pub result_data: Vec<Vec<String>>,
    pub total_rows: usize,
    pub current_row: RwLock<usize>,
    pub done: RwLock<bool>,
}
