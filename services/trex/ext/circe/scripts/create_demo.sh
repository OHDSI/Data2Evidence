#!/bin/bash

# Quick Extension Demo Script
# Demonstrates the extension functionality with example SQL

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🦆 DuckDB Quack Extension Demo"
echo "=============================="

# Create a demo SQL file showing how to use the extension
DEMO_SQL="$PROJECT_DIR/demo_extension.sql"

cat > "$DEMO_SQL" << 'EOF'
-- DuckDB Quack Extension Demo
-- ============================
-- This file demonstrates how to use the quack extension once it's built and loaded

-- Step 1: Load the extension
-- LOAD 'build/release/extension/quack/quack.duckdb_extension';

-- Step 2: Test the basic quack function
SELECT '=== Basic Quack Function ===' as demo_section;
SELECT quack('Alice') as greeting;
SELECT quack('Bob') as greeting;  
SELECT quack('Charlie') as greeting;

-- Step 3: Test the OpenSSL version function
SELECT '=== Quack with OpenSSL Version ===' as demo_section;
SELECT quack_openssl_version('Developer') as version_info;
SELECT quack_openssl_version('Tester') as version_info;

-- Step 4: Use in a more practical example
SELECT '=== Practical Example ===' as demo_section;
SELECT 
    name,
    quack(name) as personalized_greeting
FROM (VALUES 
    ('Alice'), 
    ('Bob'), 
    ('Charlie')
) as users(name);

-- Step 5: Combine with other SQL operations
SELECT '=== Advanced Usage ===' as demo_section;
SELECT 
    UPPER(quack('database')) as loud_quack,
    LENGTH(quack('test')) as message_length;
EOF

echo "📝 Demo SQL file created: demo_extension.sql"
echo ""
echo "This file contains example SQL queries that demonstrate the extension usage."
echo ""
echo "To use this demo:"
echo "1. Build the extension: ./scripts/test_extension.sh"
echo "2. Run DuckDB and load the extension"
echo "3. Execute the queries in demo_extension.sql"
echo ""
echo "Example usage:"
echo "  duckdb"
echo "  D LOAD 'build/release/extension/quack/quack.duckdb_extension';"
echo "  D .read demo_extension.sql"
echo ""

cat "$DEMO_SQL"
