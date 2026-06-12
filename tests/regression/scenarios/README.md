# Scenarios

Each subdirectory here is one named scenario. The runner auto-discovers them.

## Adding a scenario

### From a HAR file (multi-request journey)

1. In Chrome/Firefox DevTools → Network tab → right-click any request → "Save all as HAR"
2. Create a folder: `scenarios/<descriptive-name>/`
3. Save the file as `input.har` inside that folder

Each request entry in the HAR becomes a separately timed scenario named `<folder-name>_<index>`.

### From a curl command (single endpoint)

1. In Chrome DevTools → right-click a request → Copy → "Copy as cURL"
2. Create a folder: `scenarios/<descriptive-name>/`
3. Paste the curl command (multi-line is fine) into `input.curl` inside that folder

The folder name becomes the scenario name.

## Auth

Set the `BEARER_TOKEN` env var before running. The runner injects it as the `Authorization: Bearer <token>` header on every request, overriding any token captured in the HAR/curl.

## Running

```sh
# Run performance regression tests (compares vs baseline.json)
BEARER_TOKEN=<token> npm test

# Record/update baseline (run on a clean main branch, then commit baseline.json)
BEARER_TOKEN=<token> npm run baseline

# Print results vs baseline without updating it
BEARER_TOKEN=<token> npm run report
```

## Thresholds

| Env var | Default | Effect |
|---|---|---|
| `PERF_WARN_THRESHOLD` | `0.10` | Prints a warning if p95 grows by more than 10% |
| `PERF_FAIL_THRESHOLD` | `0.20` | Fails the test if p95 grows by more than 20% |
| `PERF_REPETITIONS` | `3` | Number of times each request is repeated per run |
