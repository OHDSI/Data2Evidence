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

## Refreshing screenshot baselines

Baselines are committed per platform, and CI runs Linux, so the committed files
are `*-linux.png`. Running the suite on macOS writes `*-darwin.png`, which CI
never reads - **you cannot refresh a baseline from a Mac by running `npm test`.**
It has to be rendered on Linux.

Use `./refresh-baselines.sh`:

```bash
# On Linux/amd64: build the image CI builds and re-render against your stack.
./refresh-baselines.sh container tests/01-example.spec.ts

# Anywhere else, and especially on Apple Silicon: take the screenshots CI
# itself rendered, from the failing run's error-context artifact.
./refresh-baselines.sh from-ci <run-id>
```

On Apple Silicon the container mode runs amd64 Chromium under emulation and is
too slow to be useful - measured here, a test that takes 24 seconds natively had
not finished after ten minutes. Use `from-ci` there.

The container cannot reach the stack by container name: the certificate is
issued for `localhost`, and any other SNI gets a TLS internal error. The script
forwards `localhost:41100` inside the container to caddy so Chromium sends the
SNI the certificate expects.

Whichever mode you use, **open each changed PNG before committing.** Updating a
baseline records whatever the app renders now, including a regression.

Note `maxFailures` is 1 under CI: the first failing test stops the run, so an
unrelated failure hides every screenshot behind it. Fix that one first, or the
artifact will have nothing to refresh from.