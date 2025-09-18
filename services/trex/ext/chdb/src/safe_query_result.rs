use chdb_rust::query_result::QueryResult;

pub struct SafeQueryResult {
    inner: QueryResult,
}

impl SafeQueryResult {
    pub fn new(result: QueryResult) -> Self {
        Self { inner: result }
    }

    pub fn safe_data_utf8(&self) -> Result<String, Box<dyn std::error::Error>> {
        
        match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            self.inner.data_utf8()
        })) {
            Ok(result) => result.map_err(|e| format!("ChDB data access error: {}", e).into()),
            Err(_) => {
                
                self.fallback_data_access()
            }
        }
    }

    
    fn fallback_data_access(&self) -> Result<String, Box<dyn std::error::Error>> {
        
        match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            self.inner.data_utf8_lossy()
        })) {
            Ok(result) => Ok(result.to_string()),
            Err(_) => {
                
                Err("ChDB result data is corrupted or inaccessible".into())
            }
        }
    }

    
    pub fn rows_read(&self) -> u64 {
        match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            self.inner.rows_read()
        })) {
            Ok(rows) => rows,
            Err(_) => 0, 
        }
    }

    pub fn bytes_read(&self) -> u64 {
        match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            self.inner.bytes_read()
        })) {
            Ok(bytes) => bytes,
            Err(_) => 0, 
        }
    }

    pub fn elapsed(&self) -> std::time::Duration {
        match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            self.inner.elapsed()
        })) {
            Ok(duration) => duration,
            Err(_) => std::time::Duration::from_secs(0), 
        }
    }
}


pub fn safe_execute_query(
    session: &chdb_rust::session::Session,
    query: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    
    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        session.execute(query, None)
    })) {
        Ok(result) => {
            match result {
                Ok(query_result) => {
                    let safe_result = SafeQueryResult::new(query_result);
                    safe_result.safe_data_utf8()
                },
                Err(e) => Err(format!("ChDB execution error: {}", e).into()),
            }
        },
        Err(_) => {
            Err("ChDB execution caused a panic (likely memory safety issue)".into())
        }
    }
}
