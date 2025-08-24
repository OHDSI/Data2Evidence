#!/bin/bash

# Simple Docker build script for DuckDB LLaMA extension

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_usage() {
    echo -e "${BLUE}Usage: $0 [OPTIONS]${NC}"
    echo ""
    echo "Options:"
    echo "  --build          Build the Docker image (default)"
    echo "  --test           Run tests in container"
    echo "  --run            Run interactive container"
    echo "  --clean          Clean up containers and images"
    echo "  --help           Show this help"
    echo ""
    echo "Examples:"
    echo "  $0               # Build image"
    echo "  $0 --test        # Build and run tests"
    echo "  $0 --run         # Build and run interactive session"
}

build_image() {
    echo -e "${BLUE}Building DuckDB LLaMA extension with GPU support...${NC}"
    docker build -t duckdb-llama .
    echo -e "${GREEN}Build completed!${NC}"
}

run_tests() {
    echo -e "${BLUE}Running tests in container...${NC}"
    build_image
    docker run --rm --gpus all duckdb-llama make test
    echo -e "${GREEN}Tests completed!${NC}"
}

run_interactive() {
    echo -e "${BLUE}Starting interactive container...${NC}"
    build_image
    docker run -it --rm --gpus all -v $(pwd)/models:/workspace/models duckdb-llama bash
}

cleanup() {
    echo -e "${YELLOW}Cleaning up containers and images...${NC}"
    docker container prune -f
    docker image rm duckdb-llama 2>/dev/null || true
    echo -e "${GREEN}Cleanup completed!${NC}"
}

# Main logic
case "${1:-build}" in
    --build|build)
        build_image
        ;;
    --test|test)
        run_tests
        ;;
    --run|run)
        run_interactive
        ;;
    --clean|clean)
        cleanup
        ;;
    --help|help|-h)
        show_usage
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_usage
        exit 1
        ;;
esac
