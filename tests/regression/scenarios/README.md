# Scenarios

Each subdirectory here is one named scenario. The runner auto-discovers them.

## Adding a scenario

### From a HAR file (multi-request journey)

1. In Chrome/Firefox DevTools → Network tab → right-click any request → "Save all as HAR"
2. Create a folder: `scenarios/<descriptive-name>/`
3. Save the file as `input.har` inside that folder
4. Replace hardcoded host, dataset IDs, and config IDs with `{{key}}` template variables (e.g. `{{D2E_BASE_URL}}`, `{{DATASET_ID}}`, `{{PA_CONFIG_ID}}`)
5. Run `npm run baseline` and commit the generated `scenarios/<descriptive-name>/baseline.json`

### From a curl command (single endpoint)

1. In Chrome DevTools → right-click a request → Copy → "Copy as cURL"
2. Create a folder: `scenarios/<descriptive-name>/`
3. Paste the curl command (multi-line is fine) into `input.curl` inside that folder
4. Replace hardcoded values with `{{key}}` template variables
5. Run `npm run baseline` and commit the generated `scenarios/<descriptive-name>/baseline.json`

The folder name becomes the scenario name.

## Auth

Set the `BEARER_TOKEN` env var before running. The runner injects it as the `Authorization: Bearer <token>` header on every request, overriding any token captured in the HAR/curl.

## Running

```sh
# Run performance regression tests (compares vs per-scenario baseline.json)
set -a && source .env && set +a && npm test

# Record/update baseline — writes scenarios/<name>/baseline.json for each scenario
# Run on a clean main branch, then commit the baseline files
set -a && source .env && set +a && npm run baseline

# Print results vs baseline without updating it
set -a && source .env && set +a && npm run report
```

## Thresholds

| Env var | Default | Effect |
|---|---|---|
| `PERF_WARN_THRESHOLD` | `0.10` | Prints a warning if p95 grows by more than 10% |
| `PERF_FAIL_THRESHOLD` | `0.20` | Fails the test if p95 grows by more than 20% |
| `PERF_REPETITIONS` | `3` | Number of times each request is repeated per run |
