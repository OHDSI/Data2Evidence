use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use tokio::sync::oneshot;

#[derive(Debug)]
pub struct ServerHandle {
    pub thread_handle: JoinHandle<Result<(), Box<dyn std::error::Error + Send + Sync>>>,
    pub shutdown_tx: oneshot::Sender<()>,
    pub start_time: std::time::SystemTime,
    pub db_credentials: String,
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

    pub fn instance() -> &'static ServerRegistry {
        static INSTANCE: std::sync::OnceLock<ServerRegistry> = std::sync::OnceLock::new();
        INSTANCE.get_or_init(|| ServerRegistry::new())
    }

    pub fn server_key(host: &str, port: u16) -> String {
        format!("{}:{}", host, port)
    }

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

    pub fn update_db_credentials(&self, _host: &str, _port: u16, new_credentials: String) -> Result<String, String> {
        let mut servers = self.servers.lock().unwrap();
        let count = servers.len();
        
        if count == 0 {
            return Err("No servers are currently running".to_string());
        }
        
        for (_, handle) in servers.iter_mut() {
            handle.db_credentials = new_credentials.clone();
        }
        
        Ok(format!("Database credentials updated for {} server(s)", count))
    }

    pub fn get_db_credentials(&self, host: &str, port: u16) -> Option<String> {
        let servers = self.servers.lock().unwrap();
        let key = Self::server_key(host, port);
        servers.get(&key).map(|handle| handle.db_credentials.clone())
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

    pub fn get_servers_info(&self) -> Vec<(String, u16, u64, bool)> {
        let servers = self.servers.lock().unwrap();
        let mut server_info = Vec::new();
        
        for (key, handle) in servers.iter() {
            let parts: Vec<&str> = key.split(':').collect();
            if parts.len() == 2 {
                let host = parts[0].to_string();
                let port = parts[1].parse::<u16>().unwrap_or(0);
                let uptime_secs = handle.start_time.elapsed()
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                let has_credentials = !handle.db_credentials.is_empty();
                
                server_info.push((host, port, uptime_secs, has_credentials));
            }
        }
        
        server_info
    }
}
