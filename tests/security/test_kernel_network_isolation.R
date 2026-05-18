# Security test: Run this inside a Jupyter kernel to check what it can reach
# on the internal network and what environment variables are exposed.

library(httr)

cat("=== 1. ENVIRONMENT LEAK CHECK ===\n")
cat("Checking for sensitive environment variables passed to the kernel...\n\n")

sensitive_patterns <- c(
  "TREX", "POSTGRES", "PG_", "DB_", "REDIS", "PASSWORD", "SECRET",
  "TOKEN", "KEY", "CERT", "TLS", "LOGTO", "MINIO", "S3_"
)

all_env <- Sys.getenv()
for (pattern in sensitive_patterns) {
  matches <- grep(pattern, names(all_env), value = TRUE, ignore.case = TRUE)
  if (length(matches) > 0) {
    for (var_name in matches) {
      value <- all_env[[var_name]]
      # Redact values longer than 8 chars, show first 4
      if (nchar(value) > 8) {
        display_value <- paste0(substr(value, 1, 4), "...[REDACTED]")
      } else {
        display_value <- value
      }
      cat(sprintf("  [LEAKED] %s = %s\n", var_name, display_value))
    }
  }
}

cat("\n=== 2. TREX REACHABILITY CHECK ===\n")

trex_url <- Sys.getenv("TREX__ENDPOINT_URL", unset = "")
if (trex_url == "") {
  cat("TREX__ENDPOINT_URL not set in environment, trying default...\n")
  trex_url <- "http://d2e-trex.alp.local:33001"
}
cat(sprintf("Target: %s\n\n", trex_url))

# Test 1: Basic connectivity
cat("Test 2a: GET /health or /\n")
tryCatch({
  resp <- GET(paste0(trex_url, "/"), timeout(5))
  cat(sprintf("  Status: %d  --> REACHABLE\n", status_code(resp)))
  cat(sprintf("  Body (first 200 chars): %s\n", substr(content(resp, "text", encoding = "UTF-8"), 1, 200)))
}, error = function(e) {
  cat(sprintf("  Connection failed: %s\n", e$message))
})

# Test 2: Try to hit an API endpoint (e.g., system info)
cat("\nTest 2b: GET /system-portal/system/info\n")
tryCatch({
  resp <- GET(paste0(trex_url, "/system-portal/system/info"), timeout(5))
  cat(sprintf("  Status: %d\n", status_code(resp)))
  cat(sprintf("  Body (first 200 chars): %s\n", substr(content(resp, "text", encoding = "UTF-8"), 1, 200)))
}, error = function(e) {
  cat(sprintf("  Connection failed: %s\n", e$message))
})

# Test 3: Try an authenticated endpoint without credentials
cat("\nTest 2c: GET /dataset (typically requires auth)\n")
tryCatch({
  resp <- GET(paste0(trex_url, "/dataset"), timeout(5))
  cat(sprintf("  Status: %d  --> %s\n", status_code(resp),
      ifelse(status_code(resp) == 401, "AUTH ENFORCED (good)", "ACCESSIBLE WITHOUT AUTH (bad)")))
}, error = function(e) {
  cat(sprintf("  Connection failed: %s\n", e$message))
})

cat("\n=== 3. INTERNAL DNS / NETWORK SCAN ===\n")
cat("Checking if kernel can resolve other internal service hostnames...\n\n")

internal_hosts <- c(
  "d2e-trex.alp.local",
  "d2e-minerva-postgres-1",
  "d2e-redis-1",
  "d2e-alp-logto-1",
  "d2e-supabase-storage-1",
  "d2e-alp-caddy-1",
  "d2e-mlflow"
)

for (host in internal_hosts) {
  tryCatch({
    resolved <- nsl(host)
    if (!is.null(resolved)) {
      cat(sprintf("  [RESOLVABLE] %s --> %s\n", host, resolved))
    } else {
      cat(sprintf("  [NOT FOUND]  %s\n", host))
    }
  }, error = function(e) {
    cat(sprintf("  [NOT FOUND]  %s\n", host))
  })
}

cat("\n=== 4. PORT SCAN ON REACHABLE HOSTS ===\n")
cat("Testing common service ports on resolved hosts...\n\n")

test_port <- function(host, port, label) {
  tryCatch({
    con <- socketConnection(host, port, open = "r", blocking = TRUE, timeout = 3)
    close(con)
    cat(sprintf("  [OPEN] %s:%d (%s)\n", host, port, label))
  }, error = function(e) {
    cat(sprintf("  [closed] %s:%d (%s)\n", host, port, label))
  })
}

targets <- list(
  list(host = "d2e-trex.alp.local",         port = 33001L, label = "Trex API"),
  list(host = "d2e-trex.alp.local",         port = 33000L, label = "Trex TLS"),
  list(host = "d2e-minerva-postgres-1",      port = 5432L,  label = "PostgreSQL"),
  list(host = "d2e-redis-1",                 port = 6379L,  label = "Redis"),
  list(host = "d2e-alp-logto-1",             port = 3001L,  label = "Logto"),
  list(host = "d2e-supabase-storage-1",      port = 5000L,  label = "Supabase Storage"),
  list(host = "d2e-mlflow",                  port = 5000L,  label = "MLflow")
)

for (t in targets) {
  test_port(t$host, t$port, t$label)
}

cat("\n=== 5. SUMMARY ===\n")
cat("Review the results above:\n")
cat("- Section 1: Any LEAKED vars indicate env not properly sanitized\n")
cat("- Section 2: If Trex is reachable without auth, kernels can call backend APIs\n")
cat("- Section 3: Resolvable hosts = kernel can see them on the network\n")
cat("- Section 4: Open ports = kernel can establish TCP connections to those services\n")
cat("\nExpected (secure) result:\n")
cat("- Only TREX should be reachable (it's intentionally on the kernel network)\n")
cat("- TREX endpoints should enforce authentication (401 without token)\n")
cat("- Redis, PostgreSQL, Logto, Supabase should NOT be resolvable/reachable\n")
cat("- No passwords, secrets, or TLS keys in environment\n")
