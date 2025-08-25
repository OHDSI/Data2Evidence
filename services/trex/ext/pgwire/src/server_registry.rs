use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use tokio::sync::oneshot;

#[derive(Debug)]
pub struct ServerHandle {
    pub thread_handle: JoinHandle<Result<(), Box<dyn std::error::Error + Send + Sync>>>,
    pub shutdown_tx: oneshot::Sender<()>,
    pub start_time: std::time::SystemTime,
}

pub struct ServerRegistry {
    servers: Arc<Mutex<HashMap<String, ServerHandle>>>,
}

impl ServerRegistry {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Get the global singleton instance
    pub fn instance() -> &'static ServerRegistry {
        static INSTANCE: std::sync::OnceLock<ServerRegistry> = std::sync::OnceLock::new();
        INSTANCE.get_or_init(|| ServerRegistry::new())
    }

    /// Create a server key from host and port
    pub fn server_key(host: &str, port: u16) -> String {
        format!("{}:{}", host, port)
    }

    /// Check if a server is running on the given host:port
    pub fn is_server_running(&self, host: &str, port: u16) -> bool {
        let servers = self.servers.lock().unwrap();
        let key = Self::server_key(host, port);
        servers.contains_key(&key)
    }

    pub fn register_server(
        &self,
        host: String,
        port: u16,
        handle: ServerHandle,
    ) -> Result<(), String> {
        let mut servers = self.servers.lock().unwrap();
        let key = Self::server_key(&host, port);
        
        if servers.contains_key(&key) {
            return Err(format!("Server already running on {}:{}", host, port));
        }
        
        servers.insert(key, handle);
        Ok(())
    }

    pub fn stop_server(&self, host: &str, port: u16) -> Result<String, String> {
        let mut servers = self.servers.lock().unwrap();
        let key = Self::server_key(host, port);
        
        if let Some(handle) = servers.remove(&key) {
            let _ = handle.shutdown_tx.send(());
            Ok(format!("Shutdown signal sent to server {}:{}", host, port))
        } else {
            Err(format!("No server running on {}:{}", host, port))
        }
    }

    pub fn get_status(&self) -> String {
        let servers = self.servers.lock().unwrap();
        
        if servers.is_empty() {
            return "No pgwire servers currently running".to_string();
        }
        
        let mut status_lines = vec!["Running pgwire servers:".to_string()];
        
        for (key, handle) in servers.iter() {
            let uptime = handle.start_time.elapsed()
                .map(|d| format!("{}s", d.as_secs()))
                .unwrap_or_else(|_| "unknown".to_string());
            
            status_lines.push(format!(
                "  {} (uptime: {})",
                key, uptime
            ));
        }
        
        status_lines.join("\n")
    }
}
