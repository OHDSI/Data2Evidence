#!/bin/bash

# DuckDB Extension Test Script
# This script builds and tests the quack extension with a simple example

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/build"

echo "🦆 DuckDB Quack Extension Test Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "$PROJECT_DIR/extension_config.cmake" ]]; then
    print_error "This script must be run from the extension-template project directory"
    exit 1
fi

# Initialize git submodules if they don't exist
print_status "Checking git submodules..."
if [[ ! -f "$PROJECT_DIR/duckdb/CMakeLists.txt" ]] || [[ ! -f "$PROJECT_DIR/extension-ci-tools/makefiles/duckdb_extension.Makefile" ]]; then
    print_status "Initializing git submodules..."
    cd "$PROJECT_DIR"
    git submodule update --init --recursive
    if [[ $? -ne 0 ]]; then
        print_error "Failed to initialize git submodules"
        exit 1
    fi
    print_success "Git submodules initialized"
else
    print_success "Git submodules already present"
fi

# Optional: FAST_EXTENSION_ONLY=1 to build only quack targets after initial configure
FAST_EXTENSION_ONLY=${FAST_EXTENSION_ONLY:-0}
SHOW_HASH_DEBUG=${SHOW_HASH_DEBUG:-1}

# Rebuild logic: only build if sources changed or artifact missing
print_status "Determining if build is required..."
mkdir -p "$BUILD_DIR"
BUILD_HASH_FILE="$BUILD_DIR/.last_source_hash"
ARTIFACT="$BUILD_DIR/release/extension/quack/quack.duckdb_extension"

# Collect a hash of relevant sources & config files
SOURCE_HASH=$( (
  find "$PROJECT_DIR/src" -type f \( -name '*.cpp' -o -name '*.hpp' \) -print0 2>/dev/null | sort -z | xargs -0 cat 2>/dev/null
  cat "$PROJECT_DIR/extension_config.cmake" 2>/dev/null || true
  cat "$PROJECT_DIR/Makefile" 2>/dev/null || true
  cat "$PROJECT_DIR/vcpkg.json" 2>/dev/null || true
) | sha256sum | cut -d' ' -f1 )

[[ $SHOW_HASH_DEBUG -eq 1 ]] && echo "[DEBUG] Current source hash: $SOURCE_HASH"

PREV_HASH=""
[[ -f "$BUILD_HASH_FILE" ]] && PREV_HASH=$(cat "$BUILD_HASH_FILE" || echo "")
[[ $SHOW_HASH_DEBUG -eq 1 && -n "$PREV_HASH" ]] && echo "[DEBUG] Previous source hash: $PREV_HASH"

NEED_BUILD=0
if [[ ! -f "$ARTIFACT" ]]; then
  print_status "Build artifact not found; build required."; NEED_BUILD=1
elif [[ ! -f "$BUILD_HASH_FILE" ]]; then
  print_status "No previous hash file; build required."; NEED_BUILD=1
elif [[ "$PREV_HASH" != "$SOURCE_HASH" ]]; then
  print_status "Source hash changed; build required."; NEED_BUILD=1
else
  print_success "No source changes detected; skipping rebuild."
fi

if [[ $NEED_BUILD -eq 1 || -n "$FORCE_REBUILD" ]]; then
  if [[ -n "$FORCE_REBUILD" ]]; then
    print_warning "FORCE_REBUILD set; rebuilding regardless of hash."
  fi
  if [[ $FAST_EXTENSION_ONLY -eq 1 && -d "$BUILD_DIR/release" && -f "$BUILD_DIR/release/Makefile" ]]; then
    print_status "FAST_EXTENSION_ONLY=1 -> building only quack extension targets"
    (cd "$BUILD_DIR/release" && cmake --build . --target quack_loadable_extension quack_extension)
  else
    print_status "Performing full (make release) build... (set FAST_EXTENSION_ONLY=1 for faster incremental builds)"
    (cd "$PROJECT_DIR" && make release)
  fi
  print_success "Extension built successfully"
  echo "$SOURCE_HASH" > "$BUILD_HASH_FILE"
else
  print_status "Using existing build. (Set FORCE_REBUILD=1 to force rebuild)"
fi

# Find the DuckDB executable
DUCKDB_EXECUTABLE=""
if [[ -f "$BUILD_DIR/release/duckdb" ]]; then
    DUCKDB_EXECUTABLE="$BUILD_DIR/release/duckdb"
elif [[ -f "$BUILD_DIR/duckdb" ]]; then
    DUCKDB_EXECUTABLE="$BUILD_DIR/duckdb"
else
    # Try to find it in common locations
    for path in "$BUILD_DIR"/**/duckdb; do
        if [[ -f "$path" && -x "$path" ]]; then
            DUCKDB_EXECUTABLE="$path"
            break
        fi
    done
fi

if [[ -z "$DUCKDB_EXECUTABLE" ]]; then
    print_error "Could not find DuckDB executable after build"
    print_status "Build directory contents:"
    find "$BUILD_DIR" -name "duckdb" -type f 2>/dev/null || echo "No duckdb executable found"
    exit 1
fi

print_success "Found DuckDB executable at: $DUCKDB_EXECUTABLE"

# Create a test SQL file
TEST_SQL="$BUILD_DIR/test_quack.sql"
cat > "$TEST_SQL" << 'EOF'
-- Load the quack extension
LOAD 'quack';

-- Pre-create temp table to support statements that depend on it
CREATE TEMP TABLE IF NOT EXISTS tmp_numbers AS SELECT * FROM range(5);

-- Test the basic quack function
SELECT '=== Testing quack function ===' as test_section;
SELECT quack('Alice') as result;
SELECT quack('Bob') as result;
SELECT quack('World') as result;

-- Test the quack_openssl_version function
SELECT '=== Testing quack_openssl_version function ===' as test_section;
SELECT quack_openssl_version('Developer') as result;

-- Test random_sql_statement (returns a random SQL string)
SELECT '=== Testing random_sql_statement ===' as test_section;
SELECT random_sql_statement() AS random_sql_text;

-- Verify the functions exist & extension loaded
SELECT '=== Extension loaded successfully! ===' as test_section;
EOF

# Run the test
print_status "Running extension test..."
echo ""
echo "🧪 Test Output:"
echo "==============="

if "$DUCKDB_EXECUTABLE" < "$TEST_SQL"; then
    echo ""
    print_success "🎉 Extension test (phase 1) completed successfully!"

    # Phase 2: capture a random SQL statement and execute it
    print_status "Capturing a random SQL statement to execute..."
    RANDOM_SQL=$( "$DUCKDB_EXECUTABLE" -csv -header <<'EOSQL' | tail -n +2 | tr -d '\r'
LOAD 'quack';
CREATE TEMP TABLE IF NOT EXISTS tmp_numbers AS SELECT * FROM range(5);
SELECT random_sql_statement() AS stmt;
EOSQL
)

    if [[ -z "$RANDOM_SQL" ]]; then
        print_error "Failed to capture random SQL statement"
        exit 1
    fi
    print_status "Random SQL selected: $RANDOM_SQL"

    print_status "Executing captured random SQL..."
    if EXEC_OUTPUT=$("$DUCKDB_EXECUTABLE" <<EOSQL
LOAD 'quack';
CREATE TEMP TABLE IF NOT EXISTS tmp_numbers AS SELECT * FROM range(5);
$RANDOM_SQL;
EOSQL
); then
        print_success "Random SQL executed successfully"
        echo "---- Execution Output Start ----"
        echo "$EXEC_OUTPUT"
        echo "---- Execution Output End ----"
    else
        print_error "Execution of random SQL failed"
        echo "Statement: $RANDOM_SQL"
        exit 1
    fi

    echo ""
    print_success "🎉 Extension test completed successfully!"
    echo ""
    echo "The quack extension is working correctly. You can now use:"
    echo "  • quack('name')"
    echo "  • quack_openssl_version('name')"
    echo "  • random_sql_statement()  -- returns a random candidate SQL string"
    echo ""
    echo "Example of capturing & executing in shell:"
    echo "  stmt=\$(duckdb -csv -header <<'SQL' | tail -n +2)"
    echo "  LOAD 'quack'; CREATE TEMP TABLE IF NOT EXISTS tmp_numbers AS SELECT * FROM range(5);"
    echo "  SELECT random_sql_statement() AS stmt;"
    echo "  SQL"
    echo "  duckdb <<SQL"
    echo "  LOAD 'quack'; CREATE TEMP TABLE IF NOT EXISTS tmp_numbers AS SELECT * FROM range(5);"
    echo "  \$stmt;"
    echo "  SQL"
    echo ""
    echo "To use the extension in your own DuckDB instance (from project root):"
    echo "  LOAD 'build/release/extension/quack/quack.duckdb_extension';"
    echo ""
    echo "Note: random_sql_statement chooses from statements that may depend on tmp_numbers; ensure it's created first."    
else
    print_error "Extension test failed"
    exit 1
fi

# Cleanup
rm -f "$TEST_SQL"

print_success "Test script completed successfully!"
