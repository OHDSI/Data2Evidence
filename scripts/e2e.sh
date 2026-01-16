#!/bin/bash
set -e

# E2E Testing Script for Data2Evidence
# Usage: ./scripts/e2e.sh <command> [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
E2E_DIR="$ROOT_DIR/tests/e2e"

# Default values
SKIP_UI=false
NO_SNAPSHOT=false
BRANCH=""
TEST_FILTER=""
UPDATE_SCREENSHOTS=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Volumes to snapshot/restore
VOLUMES="pg-minerva-data-1 trex demodb-data"

# Environment settings to match CI
export ENV_TYPE=remote
export CADDY__CONFIG=./deploy/caddy-config

# Colors for menu
BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[0;36m'

# Helper to read a single key
read_choice() {
    read -r choice
    echo "$choice"
}

# Yes/No prompt, returns 0 for yes, 1 for no
ask_yes_no() {
    local prompt="$1"
    local default="${2:-y}"
    local yn
    if [ "$default" = "y" ]; then
        printf "%s [Y/n]: " "$prompt"
    else
        printf "%s [y/N]: " "$prompt"
    fi
    read -r yn
    yn="${yn:-$default}"
    case "$yn" in
        [Yy]*) return 0 ;;
        *) return 1 ;;
    esac
}

# Get current git branch name (sanitized for use in PROJECT_NAME)
get_branch_name() {
    cd "$ROOT_DIR"
    local branch
    branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    # Sanitize: replace / with - and remove special chars
    echo "$branch" | sed 's/[\/]/-/g' | sed 's/[^a-zA-Z0-9_-]//g'
}

# Generate PROJECT_NAME with timestamp and short commit hash
generate_project_name() {
    cd "$ROOT_DIR"
    local timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)
    local short_hash
    short_hash=$(git rev-parse --short=5 HEAD 2>/dev/null || echo "00000")
    echo "e2e-${timestamp}-${short_hash}"
}

# List existing e2e sessions (by finding volumes with e2e- prefix)
list_sessions() {
    docker volume ls -q 2>/dev/null | grep "^e2e-" | sed 's/_.*//' | sort -u
}

# Check if session has volumes
session_exists() {
    local session="$1"
    docker volume ls -q 2>/dev/null | grep -q "^${session}_"
}

# Check if session has snapshots
session_has_snapshots() {
    local session="$1"
    docker volume ls -q 2>/dev/null | grep -q "^${session}_.*_snapshot$"
}

# Select session interactively
# Sets SELECTED_SESSION variable instead of using stdout
select_session() {
    local prompt="${1:-Select session}"
    local sessions
    sessions=$(list_sessions)
    SELECTED_SESSION=""

    if [ -z "$sessions" ]; then
        log_error "No e2e sessions found with snapshots"
        return 1
    fi

    echo ""
    echo -e "${BOLD}  $prompt${NC}"
    echo ""

    local i=1
    local session_array=()
    while IFS= read -r session; do
        session_array+=("$session")
        # Check if running
        local status=""
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${session}-"; then
            status=" ${GREEN}(running)${NC}"
        fi
        echo -e "  $i) $session$status"
        ((i++))
    done <<< "$sessions"

    echo ""
    printf "  Enter choice (1-$((i-1))): "

    local choice
    read -r choice

    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -lt "$i" ]; then
        SELECTED_SESSION="${session_array[$((choice-1))]}"
        return 0
    else
        log_error "Invalid choice"
        return 1
    fi
}

# Interactive wizard
cmd_wizard() {
    echo ""
    echo -e "${BOLD}╔════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║      E2E Testing Wizard                ║${NC}"
    echo -e "${BOLD}╚════════════════════════════════════════╝${NC}"
    echo ""

    # Show current branch
    local current_branch
    current_branch=$(get_branch_name)
    echo -e "  ${DIM}Branch:${NC} ${CYAN}$current_branch${NC}"

    # Show current PROJECT_NAME if set
    if [ -n "$PROJECT_NAME" ]; then
        local running=""
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${PROJECT_NAME}-"; then
            running=" ${GREEN}(running)${NC}"
        fi
        echo -e "  ${DIM}Session:${NC} ${CYAN}$PROJECT_NAME${NC}$running"
    fi

    # Show available sessions count
    local session_count
    session_count=$(list_sessions | wc -l | tr -d ' ')
    if [ "$session_count" -gt 0 ]; then
        echo -e "  ${DIM}Available sessions:${NC} $session_count"
    fi
    echo ""

    echo -e "${BOLD}  Actions${NC}"
    echo "  1) Fresh Setup & Test       - Build, start, and run tests"
    echo "  2) Restore & Retest         - Reset to snapshot and run tests"
    echo ""
    echo -e "${BOLD}  Session Management${NC}"
    echo "  3) List sessions"
    echo "  4) Remove session           - Stop and delete all volumes"
    echo "  5) Clean test artifacts     - Remove test-results and ctrf"
    echo ""
    echo "  q) Quit"
    echo ""
    printf "  Enter choice: "

    local choice
    choice=$(read_choice)

    case $choice in
        1)
            echo ""
            # Ask for options
            if ask_yes_no "  Build and mount UI?" "y"; then
                SKIP_UI=false
            else
                SKIP_UI=true
            fi

            printf "  Branch to checkout (leave empty for current): "
            read -r BRANCH

            printf "  Test filter (e.g., filtering-bar, leave empty for all): "
            read -r TEST_FILTER

            if ask_yes_no "  Update screenshots (regenerate baselines)?" "n"; then
                UPDATE_SCREENSHOTS=true
            fi

            echo ""
            cmd_init
            # Run tests after init completes
            log_info "Running tests..."
            cmd_test
            ;;
        2)
            echo ""
            # Select session to restore
            if ! select_session "Select session to restore and test"; then
                exit 1
            fi
            export PROJECT_NAME="$SELECTED_SESSION"
            log_info "Selected session: $PROJECT_NAME"
            # Always skip UI mount on retest - use UI from snapshot
            SKIP_UI=true

            printf "  Test filter (e.g., filtering-bar, leave empty for all): "
            read -r TEST_FILTER

            if ask_yes_no "  Update screenshots (regenerate baselines)?" "n"; then
                UPDATE_SCREENSHOTS=true
            fi

            echo ""
            cmd_retest
            ;;
        3)
            echo ""
            cmd_list_sessions
            ;;
        4)
            echo ""
            # Select session to remove
            if ! select_session "Select session to remove"; then
                exit 1
            fi
            export PROJECT_NAME="$SELECTED_SESSION"
            if ask_yes_no "  This will STOP and REMOVE all volumes for $PROJECT_NAME. Continue?" "n"; then
                cmd_clean_all
            else
                log_info "Cancelled"
            fi
            ;;
        5)
            echo ""
            cmd_clean
            ;;
        q|Q)
            echo ""
            exit 0
            ;;
        *)
            log_error "Invalid choice: $choice"
            exit 1
            ;;
    esac
}

usage() {
    cat << EOF
E2E Testing Script for Data2Evidence

Usage: ./scripts/e2e.sh [command] [options]

Run without arguments to launch interactive wizard.

Commands:
  init              Full initial setup (checkout, install, build, start, setup, snapshot)
  test              Run e2e tests in Docker
  retest            Restore from snapshot and run tests

  setup-env         Generate .env and set PROJECT_NAME
  setup-data        Run demo data setup (npm run setup)
  snapshot          Create volume snapshots
  restore           Restore volumes from snapshot

  build             Build everything (docker + UI)
  build-docker      Build Docker images only
  build-ui          Build UI only
  build-e2e         Build e2e Docker image

  start             Start services
  stop              Stop services
  logs              View logs
  status            Show running containers

  clean             Remove test artifacts (test-results, ctrf)
  clean-all         Remove all volumes and snapshots
  list              List all e2e sessions

Options:
  -p, --project-name NAME   Set PROJECT_NAME (default: e2e-<branch>-YYYYMMDD-HHMMSS)
  -b, --branch BRANCH       Checkout specific branch before running
  -f, --filter PATTERN      Run only tests matching pattern (e.g., filtering-bar)
  -u, --update-snapshots    Update screenshot baselines instead of comparing
  --skip-ui                 Skip UI build and mount
  --no-snapshot             Skip creating snapshots after setup
  -h, --help                Show this help message

Examples:
  ./scripts/e2e.sh init                      # Full setup with new session
  ./scripts/e2e.sh init --skip-ui            # Setup without UI (faster for backend)
  ./scripts/e2e.sh init -b feature/my-pr     # Setup and checkout branch
  ./scripts/e2e.sh test                      # Run all tests
  ./scripts/e2e.sh test -f filtering-bar     # Run tests matching "filtering-bar"
  ./scripts/e2e.sh test -u                   # Update all screenshot baselines
  ./scripts/e2e.sh test -f filtering -u      # Update screenshots for specific tests
  ./scripts/e2e.sh retest                    # Restore snapshot and run tests
  ./scripts/e2e.sh retest -f 09-patient      # Restore and run patient analytics tests
EOF
}

check_project_name() {
    if [ -z "$PROJECT_NAME" ]; then
        log_error "PROJECT_NAME is not set. Run 'export PROJECT_NAME=e2e-\$(date +%Y%m%d-%H%M%S)' or use -p flag"
        exit 1
    fi
    log_info "Using PROJECT_NAME: $PROJECT_NAME"
}

cmd_setup_env() {
    cd "$ROOT_DIR"

    if [ -z "$PROJECT_NAME" ]; then
        export PROJECT_NAME=$(generate_project_name "$BRANCH")
        log_info "Generated PROJECT_NAME: $PROJECT_NAME"
    fi

    # Check if session already exists
    if session_exists "$PROJECT_NAME"; then
        log_error "Session '$PROJECT_NAME' already exists!"
        log_error "Existing volumes found with this prefix."
        echo ""
        log_info "Options:"
        echo "  1. Use a different PROJECT_NAME: export PROJECT_NAME=e2e-myname"
        echo "  2. Clean existing session first: ./scripts/e2e.sh clean-all -p $PROJECT_NAME"
        echo "  3. Restore and retest existing: ./scripts/e2e.sh retest -p $PROJECT_NAME"
        exit 1
    fi

    # Backup existing .env.local
    if [ -f .env.local ]; then
        log_info "Backing up existing .env.local"
        mv .env.local .env.local-prev
    fi

    # Initialize D2E (ENV_TYPE and CADDY__CONFIG set globally to match CI)
    log_info "Initializing D2E..."
    init_choice=y npm run init

    # Add PLUGINS_SEED to match CI environment
    log_info "Adding PLUGINS_SEED to .env.local..."
    echo '' >> .env.local
    echo '# E2E: Match CI plugin seed configuration' >> .env.local
    echo 'PLUGINS_SEED='\''["d2e-flows", "d2e-ui", "d2e-atlas", "data-transformation-flow", "hades-flow", "trex-hana", "trex-pgwire", "d2e-fhir-server", "i2b2-flow", "data-management-flow"]'\''' >> .env.local

    # Save .env.local with session name
    cp .env.local ".env.local-$PROJECT_NAME"
    log_info "Saved .env.local as .env.local-$PROJECT_NAME"

    echo ""
    log_info "Run this to set PROJECT_NAME in your shell:"
    echo "  export PROJECT_NAME=$PROJECT_NAME"
}

cmd_build_ui() {
    cd "$ROOT_DIR/ui"
    log_info "Building UI..."
    bun install
    bun build-all
    cd "$ROOT_DIR"
}

cmd_build_docker() {
    cd "$ROOT_DIR"
    check_project_name
    log_info "Building Docker images..."
    npm run build
}

cmd_build_e2e() {
    cd "$E2E_DIR"
    log_info "Building e2e Docker image..."
    docker build -t d2e-e2e .
}

cmd_build() {
    if [ "$SKIP_UI" = false ]; then
        cmd_build_ui
    else
        log_info "Skipping UI build (--skip-ui)"
    fi
    cmd_build_docker
}

cmd_start() {
    cd "$ROOT_DIR"
    check_project_name
    log_info "Starting services..."
    npm run start
}

cmd_stop() {
    cd "$ROOT_DIR"
    check_project_name
    log_info "Stopping services..."
    npm run stop
}

cmd_logs() {
    cd "$ROOT_DIR"
    check_project_name
    npm run logs
}

cmd_list_sessions() {
    echo ""
    echo -e "${BOLD}Available E2E Sessions${NC}"
    echo ""

    local sessions
    sessions=$(list_sessions)

    if [ -z "$sessions" ]; then
        log_warn "No e2e sessions found with snapshots"
        return
    fi

    while IFS= read -r session; do
        local status="${DIM}stopped${NC}"
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${session}-"; then
            status="${GREEN}running${NC}"
        fi

        local has_snapshot=""
        if session_has_snapshots "$session"; then
            has_snapshot=" ${CYAN}[snapshot]${NC}"
        fi

        echo -e "  - $session ($status)$has_snapshot"
    done <<< "$sessions"

    echo ""
}

cmd_status() {
    check_project_name
    docker ps --filter "name=${PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

cmd_setup_data() {
    cd "$ROOT_DIR"
    check_project_name
    log_info "Setting up demo data..."
    npm run setup
}

cmd_mount_ui() {
    check_project_name
    log_info "Mounting local UI into container..."
    docker exec ${PROJECT_NAME}-trex sh -c "rm -rf /usr/src/data/plugins/@data2evidence/d2e-ui/resources"
    docker exec ${PROJECT_NAME}-trex sh -c "cp -r /usr/src/local-resources /usr/src/data/plugins/@data2evidence/d2e-ui/resources"
}

cmd_snapshot() {
    check_project_name
    log_info "Creating volume snapshots..."
    for vol in $VOLUMES; do
        log_info "  Snapshotting ${PROJECT_NAME}_${vol}..."
        docker volume create "${PROJECT_NAME}_${vol}_snapshot" 2>/dev/null || true
        docker run --rm \
            -v "${PROJECT_NAME}_${vol}:/source:ro" \
            -v "${PROJECT_NAME}_${vol}_snapshot:/backup" \
            alpine sh -c "rm -rf /backup/* && cp -a /source/. /backup/"
    done
    log_info "Snapshots created successfully"
}

cmd_restore() {
    check_project_name
    log_info "Restoring volumes from snapshot..."
    for vol in $VOLUMES; do
        log_info "  Restoring ${PROJECT_NAME}_${vol}..."
        docker run --rm \
            -v "${PROJECT_NAME}_${vol}_snapshot:/source:ro" \
            -v "${PROJECT_NAME}_${vol}:/target" \
            alpine sh -c "rm -rf /target/* && cp -a /source/. /target/"
    done
    log_info "Volumes restored successfully"
}

cmd_clean() {
    cd "$E2E_DIR"
    log_info "Cleaning test artifacts..."
    rm -rf test-results ctrf
    log_info "Test artifacts cleaned"
}

cmd_clean_all() {
    check_project_name
    cd "$ROOT_DIR"

    log_info "Stopping services..."
    npm run stop || true

    log_info "Removing containers for ${PROJECT_NAME}..."
    docker rm $(docker ps -aq --filter "name=^${PROJECT_NAME}-") 2>/dev/null || true

    log_info "Removing all volumes for ${PROJECT_NAME}..."
    docker volume rm $(docker volume ls -q | grep "^${PROJECT_NAME}_") 2>/dev/null || true

    log_info "Removing networks for ${PROJECT_NAME}..."
    docker network rm $(docker network ls -q --filter "name=^${PROJECT_NAME}_") 2>/dev/null || true

    log_info "Session ${PROJECT_NAME} removed"
}

cmd_test() {
    check_project_name
    cd "$E2E_DIR"

    # Build e2e image (uses cache if nothing changed)
    log_info "Building e2e Docker image..."
    docker build -t d2e-e2e .

    # Build test command with optional filter and update snapshots
    local test_cmd="npm test --"
    if [ -n "$TEST_FILTER" ]; then
        test_cmd="$test_cmd $TEST_FILTER"
        log_info "Running e2e tests matching: $TEST_FILTER"
    else
        log_info "Running all e2e tests..."
    fi
    if [ "$UPDATE_SCREENSHOTS" = true ]; then
        test_cmd="$test_cmd --update-snapshots"
        log_info "Updating screenshots (baselines will be overwritten)"
    fi

    docker run --rm -it \
        --network=host \
        --ipc=host \
        -v "$(pwd)/tests:/work/tests" \
        -v "$(pwd)/test-results:/work/test-results" \
        -v "$(pwd)/ctrf:/work/ctrf" \
        -v "$(pwd)/playwright.config.ts:/work/playwright.config.ts" \
        -e D2E_BASE_URL=https://localhost:41100 \
        -e CI=true \
        d2e-e2e $test_cmd
}

cmd_retest() {
    check_project_name

    log_info "Stopping services..."
    cmd_stop

    log_info "Restoring from snapshot..."
    cmd_restore

    log_info "Starting services..."
    cmd_start

    if [ "$SKIP_UI" = false ]; then
        log_info "Mounting UI..."
        cmd_mount_ui
    else
        log_info "Skipping UI mount (--skip-ui)"
    fi

    log_info "Cleaning test artifacts..."
    cmd_clean

    log_info "Running tests..."
    cmd_test
}

cmd_init() {
    cd "$ROOT_DIR"

    # Checkout branch if specified
    if [ -n "$BRANCH" ]; then
        log_info "Checking out branch: $BRANCH"
        git fetch origin
        git checkout "$BRANCH"
        git submodule update --recursive
    fi

    # Install dependencies
    log_info "Installing dependencies..."
    npm install

    # Patch seed config
    log_info "Patching seed config for e2e..."
    node ./scripts/patch-seed-for-e2e.js

    # Setup environment
    cmd_setup_env

    # Build
    cmd_build

    # Start services
    cmd_start

    # Setup demo data
    cmd_setup_data

    # Mount UI
    if [ "$SKIP_UI" = false ]; then
        cmd_mount_ui
    else
        log_info "Skipping UI mount (--skip-ui)"
    fi

    # Create snapshots
    if [ "$NO_SNAPSHOT" = false ]; then
        cmd_snapshot
    else
        log_info "Skipping snapshot creation (--no-snapshot)"
    fi

    # Build e2e image
    cmd_build_e2e

    log_info "============================================"
    log_info "Setup complete!"
    log_info "PROJECT_NAME: $PROJECT_NAME"
    log_info ""
    log_info "Run tests with:"
    log_info "  ./scripts/e2e.sh test"
    log_info ""
    log_info "Re-run tests (restore from snapshot):"
    log_info "  ./scripts/e2e.sh retest"
    log_info "============================================"
}

# Parse arguments
COMMAND=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project-name)
            export PROJECT_NAME="$2"
            shift 2
            ;;
        -b|--branch)
            BRANCH="$2"
            shift 2
            ;;
        --skip-ui)
            SKIP_UI=true
            shift
            ;;
        --no-snapshot)
            NO_SNAPSHOT=true
            shift
            ;;
        -f|--filter)
            TEST_FILTER="$2"
            shift 2
            ;;
        -u|--update-snapshots)
            UPDATE_SCREENSHOTS=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            if [ -z "$COMMAND" ]; then
                COMMAND="$1"
            else
                log_error "Unknown argument: $1"
                usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Execute command
case $COMMAND in
    init)       cmd_init ;;
    test)       cmd_test ;;
    retest)     cmd_retest ;;
    setup-env)  cmd_setup_env ;;
    setup-data) cmd_setup_data ;;
    snapshot)   cmd_snapshot ;;
    restore)    cmd_restore ;;
    build)      cmd_build ;;
    build-docker) cmd_build_docker ;;
    build-ui)   cmd_build_ui ;;
    build-e2e)  cmd_build_e2e ;;
    start)      cmd_start ;;
    stop)       cmd_stop ;;
    logs)       cmd_logs ;;
    status)     cmd_status ;;
    clean)      cmd_clean ;;
    clean-all)  cmd_clean_all ;;
    list)       cmd_list_sessions ;;
    wizard)     cmd_wizard ;;
    "")
        cmd_wizard
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        usage
        exit 1
        ;;
esac
