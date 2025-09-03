# D2E Testing Guide

This directory contains comprehensive testing suites for the Data2Evidence (D2E) platform.

## Testing Structure

```
tests/
├── e2e/                     # End-to-End tests using Playwright
├── backend_integration_tests/ # Backend integration tests
└── performance/             # Performance testing suites
```

## Prerequisites

Before running any tests, ensure:

1. **D2E Environment is Running:**
   ```bash
   d2e -e start
   ```

2. **Demo Data is Loaded (recommended):**
   ```bash
   d2e setupdemo
   ```

3. **Required Dependencies are Installed** (see component-specific sections below)

## End-to-End (E2E) Testing

E2E tests validate the complete D2E workflow using Playwright browser automation.

### Setup E2E Tests

```bash
cd tests/e2e
npm run init  # Installs Playwright with Chromium and dependencies
```

### Running E2E Tests

```bash
cd tests/e2e
npm test  # Runs all E2E tests
```

### E2E Test Configuration

- **Base URL**: `https://localhost:443`
- **Browser**: Chromium (headless)
- **Timeout**: 3 minutes per test, 2 minutes for assertions
- **Credentials**: `admin` / `Updatepassword12345`
- **SSL**: Ignores self-signed certificate errors
- **Screenshots**: Captured on test failures
- **Retries**: 3 attempts in CI, 0 locally

### E2E Test Development

Generate new test code interactively:
```bash
cd tests/e2e
npm run local-codegen
```

This opens a browser with Playwright Inspector to record interactions.

## Backend Integration Tests

Integration tests for D2E services and APIs.

### Setup Backend Tests

```bash
cd tests/backend_integration_tests
# Follow component-specific setup instructions
```

### Running Backend Tests

Backend tests are typically run via GitHub Actions or component-specific commands. Check individual test directories for specific instructions.

## Component-Specific Testing

### Functions Testing (Deno Serverless)

**Location**: `/functions/`

**Setup:**
```bash
cd functions
npm install  # Downloads 1GB+ LLM model on postinstall
npm run build  # Uses tbuild with trex
```

**Running:**
Tests are integrated into the build process and run via CI/CD pipelines.

### Flows Testing (Python/Prefect)

**Location**: `/flows/`

**Setup:**
```bash
cd flows
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
export GITHUB_PAT=<your_token>  # Optional, prevents API rate limits
```

**Running Flow Tests:**
```bash
# Test specific flow
cd flows/[flow_name]
yarn build  # Builds Docker image locally

# Test flow with authentication
python -m docs.tests.flowauth
```

### UI Testing (Vue.js/React)

**Location**: `/ui/`

**Setup:**
```bash
cd ui
export GITHUB_TOKEN=<token_with_read_packages_scope>
yarn install
```

**Running UI Tests:**
```bash
cd ui
yarn build-all  # Builds in correct order
nx test [component]  # Run specific component tests
```

## Performance Testing

**Location**: `/tests/performance/`

Performance tests validate system behavior under load. Specific setup instructions are in the performance directory.

## Continuous Integration (CI)

D2E uses GitHub Actions for automated testing:

### CI Test Workflows
- **Services**: `services-docker-compose-up.yml` - Full stack integration
- **Functions**: `functions-http-tests.yml` - HTTP API tests  
- **UI**: `ui-test-vue.yml`, `ui-alp-portal-test-*.yml` - Frontend tests
- **Flows**: `flows-plugin-ci.yml` - Python flow validation
- **E2E**: Manual trigger or PR validation

### Pre-commit Validation

Always run these checks before committing:

1. **Service Health Check:**
   ```bash
   d2e -e start
   # Verify all services start successfully
   ```

2. **E2E Test Suite:**
   ```bash
   cd tests/e2e && npm test
   ```

3. **Component Builds:**
   ```bash
   # Functions
   cd functions && npm run build
   
   # UI
   cd ui && yarn build-all
   
   # Flows (example)
   cd flows/base && yarn build
   ```

## Troubleshooting Tests

### Common Issues

**E2E Test Failures:**
- Ensure D2E is fully running: `d2e -e start`
- Check service logs: `d2e -e logs`
- Verify portal access: Navigate to `https://localhost:443` manually
- Review test screenshots in `tests/e2e/test-results/`

**Docker/Service Issues:**
- Memory: Ensure 8GB+ RAM available
- Ports: Check no conflicting services on 443, 5432, 6379
- WSL/Ubuntu: Verify Docker daemon is running

**Python/Flow Issues:**
- Always use virtual environment
- Install from `requirements-dev.txt`
- Set `GITHUB_PAT` to avoid API rate limits

**Node.js/UI Issues:**
- Use Node.js 18+ (avoid 16 or 20+)
- Set `GITHUB_TOKEN` for private package access
- Clear `node_modules` and reinstall if version conflicts

### Getting Help

- **GitHub Issues**: [Report bugs and issues](https://github.com/ohdsi/d2e/issues)
- **Discord**: [Join our community](https://discord.gg/5XtHky2BZe)
- **Documentation**: [D2E Docs](https://docs.d2e.sg)

## Test Data & Compliance

D2E testing uses:
- **Synthetic Data**: SYNPUF datasets for OMOP CDM testing
- **Demo Data**: Safe, synthetic healthcare data via `d2e setupdemo`
- **No PHI/PII**: All test data is anonymized and synthetic

**Healthcare Data Compliance:**
- TLS certificates validated in tests
- Authentication/authorization tested
- Data quality checks integrated
- FHIR R4 compliance validated
