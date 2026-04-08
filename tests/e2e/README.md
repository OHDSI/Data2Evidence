## Getting Started on local

1. Ensure D2E docker containers are running.
2. Pull the latest base flow image `docker pull ghcr.io/ohdsi/d2e/flow-base:develop`. If local flow changes exists build the image instead.
3. Clone `.env.example` to `.env` and update the value if needed accordingly
4. Initialize
```bash
	npm install
	npm run init
```

5. Disable IPv6 to prevent `ERR_NETWORK_CHANGED` errors during tests (caused by Docker container operations triggering IPv6 ADDRCONF events that Chromium interprets as network changes):
```bash
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
```
This takes effect immediately (no restart needed) and resets on reboot.

6. Run all tests - `npm test`
7. Run / Generate screenshot for a specific test - `npm test tests/e2e/tests/01-example.spec.ts`
8. Rerun last failed tests only - `npm run test-last-failed`