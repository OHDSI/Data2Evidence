# DuckDB Extension Test Scripts

This directory contains scripts to build and test the quack DuckDB extension.

## Scripts

### `test_extension.sh` - Full Build and Test
This is the main script that builds the extension from source and runs a comprehensive test.

**Features:**
- Automatically initializes git submodules (duckdb and extension-ci-tools)
- Builds the extension using the project's Makefile
- Finds the built DuckDB executable
- Loads the extension and runs example queries
- Provides colored output and clear success/failure messages

**Usage:**
```bash
./scripts/test_extension.sh
```

**Requirements:**
- Git (for submodule initialization)
- CMake and C++ build tools
- Internet connection (for initial submodule download)

### `simple_test.sh` - Quick Preview
A lightweight script that shows what the extension does without building it.

**Features:**
- Shows expected extension behavior
- No build requirements
- Quick preview of extension functionality

**Usage:**
```bash
./scripts/simple_test.sh
```

## Extension Overview

The quack extension provides two functions:

1. **`quack(name)`** - Returns a friendly greeting message
   ```sql
   SELECT quack('Alice');
   -- Result: 'Quack Alice 🐥'
   ```

2. **`quack_openssl_version(name)`** - Returns a greeting with OpenSSL version info
   ```sql
   SELECT quack_openssl_version('Developer');
   -- Result: 'Quack Developer, my linked OpenSSL version is OpenSSL 3.0.2 15 Mar 2022'
   ```

## Manual Testing

If you prefer to test manually:

1. Build the extension:
   ```bash
   make release
   ```

2. Find the DuckDB executable in the build directory

3. Load and test the extension:
   ```sql
   LOAD 'path/to/quack.duckdb_extension';
   SELECT quack('Test');
   SELECT quack_openssl_version('Test');
   ```

## Troubleshooting

### Git Submodules Not Initialized
If you see errors about missing makefiles, the submodules need to be initialized:
```bash
git submodule update --init --recursive
```

### Build Failures
Make sure you have the required dependencies:
- CMake (3.5+)
- C++ compiler (GCC/Clang)
- OpenSSL development libraries

### Extension Not Loading
Verify the extension path is correct and the file exists. The extension file typically has a `.duckdb_extension` suffix.
