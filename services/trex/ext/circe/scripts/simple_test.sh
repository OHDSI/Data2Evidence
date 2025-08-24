#!/bin/bash

# Simple DuckDB Extension Test Script
# This script provides a lightweight test of the quack extension

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🦆 Simple DuckDB Quack Extension Test"
echo "====================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[NOTE]${NC} $1"
}

# Check if DuckDB is available in the system
if command -v duckdb &> /dev/null; then
    print_info "Using system DuckDB installation"
    DUCKDB_CMD="duckdb"
else
    print_warning "DuckDB not found in system PATH"
    print_info "Please install DuckDB or run the full test_extension.sh script"
    echo ""
    echo "To install DuckDB:"
    echo "  • Ubuntu/Debian: wget -O- https://github.com/duckdb/duckdb/releases/download/v1.0.0/duckdb_cli-linux-amd64.zip | funzip > duckdb && chmod +x duckdb"
    echo "  • Or visit: https://duckdb.org/docs/installation/"
    exit 1
fi

# Show the extension source code
print_info "Extension source preview:"
echo "=========================="
echo "The quack extension provides these functions:"
echo "• quack(name) - Returns 'Quack [name] 🐥'"
echo "• quack_openssl_version(name) - Returns quack message with OpenSSL version"
echo ""

# Create a test that demonstrates what the extension would do
print_info "Expected extension behavior:"
echo "============================"
echo "If the extension were loaded, these would be the results:"
echo ""
echo "SELECT quack('Alice');"
echo "→ 'Quack Alice 🐥'"
echo ""
echo "SELECT quack('World');"
echo "→ 'Quack World 🐥'"
echo ""
echo "SELECT quack_openssl_version('Developer');"
echo "→ 'Quack Developer, my linked OpenSSL version is OpenSSL ...'"
echo ""

print_warning "To build and test the actual extension, run: ./scripts/test_extension.sh"
print_success "Extension preview completed!"
