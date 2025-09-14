## Getting Started on local

1. Ensure D2E docker containers are running.
2. Pull the latest base flow image `docker pull ghcr.io/ohdsi/d2e/flow-base:develop`. If local flow changes exists build the image instead.
3. Clone `.env.example` to `.env` and update the value if needed accordingly
4. Initialize
```bash
	npm install
	npm run init
```

5. Run all tests - `npm test`
6. Run / Generate screenshot for a specific test - `npm test tests/e2e/tests/01-example.spec.ts`
7. Rereun last failed tests only - `npm run test-last-failed`