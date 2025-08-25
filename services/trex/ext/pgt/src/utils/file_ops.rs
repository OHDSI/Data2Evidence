use std::fs;
use std::io;
use std::path::Path;

use crate::error::{TransformationError, TransformationResult};

/// Read SQL content from a file
pub fn read_sql_file<P: AsRef<Path>>(path: P) -> TransformationResult<String> {
    fs::read_to_string(path.as_ref()).map_err(|e| TransformationError::IoError(e))
}

/// Write SQL content to a file
pub fn write_sql_file<P: AsRef<Path>>(path: P, content: &str) -> TransformationResult<()> {
    fs::write(path.as_ref(), content).map_err(|e| TransformationError::IoError(e))
}

/// Ensure parent directory exists for a file path
pub fn ensure_parent_dir<P: AsRef<Path>>(path: P) -> TransformationResult<()> {
    if let Some(parent) = path.as_ref().parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| TransformationError::IoError(e))?;
        }
    }
    Ok(())
}

/// Check if a path is a SQL file
pub fn is_sql_file<P: AsRef<Path>>(path: P) -> bool {
    path.as_ref()
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase() == "sql")
        .unwrap_or(false)
}

/// Get file size in bytes
pub fn get_file_size<P: AsRef<Path>>(path: P) -> io::Result<u64> {
    let metadata = fs::metadata(path)?;
    Ok(metadata.len())
}

/// Check if file exists and is readable
pub fn is_readable_file<P: AsRef<Path>>(path: P) -> bool {
    path.as_ref().is_file() && path.as_ref().exists()
}

/// Get file stem (filename without extension)
pub fn get_file_stem<P: AsRef<Path>>(path: P) -> Option<String> {
    path.as_ref()
        .file_stem()
        .and_then(|stem| stem.to_str())
        .map(|s| s.to_string())
}

/// Create backup of existing file before overwriting
pub fn backup_file<P: AsRef<Path>>(path: P) -> TransformationResult<Option<std::path::PathBuf>> {
    let path = path.as_ref();

    if !path.exists() {
        return Ok(None);
    }

    let backup_path = path.with_extension(format!(
        "{}.backup",
        path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("sql")
    ));

    fs::copy(path, &backup_path).map_err(|e| TransformationError::IoError(e))?;

    Ok(Some(backup_path))
}

#[cfg(test)]
mod tests {
    use super::*;

    use tempfile::tempdir;

    #[test]
    fn test_read_write_sql_file() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.sql");
        let content = "SELECT * FROM users;";

        write_sql_file(&file_path, content).unwrap();
        let read_content = read_sql_file(&file_path).unwrap();

        assert_eq!(content, read_content);
    }

    #[test]
    fn test_ensure_parent_dir() {
        let dir = tempdir().unwrap();
        let nested_path = dir.path().join("nested").join("deep").join("file.sql");

        ensure_parent_dir(&nested_path).unwrap();

        assert!(nested_path.parent().unwrap().exists());
    }

    #[test]
    fn test_is_sql_file() {
        assert!(is_sql_file("test.sql"));
        assert!(is_sql_file("test.SQL"));
        assert!(!is_sql_file("test.txt"));
        assert!(!is_sql_file("test"));
    }

    #[test]
    fn test_backup_file() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("original.sql");
        let content = "SELECT 1;";

        write_sql_file(&file_path, content).unwrap();
        let backup_path = backup_file(&file_path).unwrap().unwrap();

        assert!(backup_path.exists());
        assert_eq!(read_sql_file(&backup_path).unwrap(), content);
    }
}
