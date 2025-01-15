# Setting resource limits

D2E provides a few environment variables to set resource limits.

| environment variable | used by                              | description                                         |
| -------------------- | ------------------------------------ | --------------------------------------------------- |
| D2E_CPU_LIMIT        | alp-cachedb                          | Limits CPU usage for docker containers              |
| D2E_MEMORY_LIMIT     | alp-cachedb, alp-dataflow-gen-worker | Limits Main memory(RAM) usage for docker containers |
| D2E_SWAP_LIMIT       | alp-dataflow-gen-worker              | Limits SWAP memory usage for docker containers      |

## Follow either steps below to set resource limits.

---

## Setting resource limits manually:

Add these environment variables into the `.env.local` file.

```
# Example values:

# 8 CPU
D2E_CPU_LIMIT=8

# 16GB RAM
D2E_MEMORY_LIMIT=16G

# 64GB SWAP
D2E_SWAP_LIMIT=64G
```

---

## Setting resource limits based on system resources:

Run command:

```
yarn gen:resource-limits
```

This will automatically generate these 3 environment variables into the `.env.local` file.

1. D2E_CPU_LIMIT
2. D2E_MEMORY_LIMIT
3. D2E_SWAP_LIMIT

> [!NOTE]

For `D2E_CPU_LIMIT` and `D2E_MEMORY_LIMIT`, 70% of the system's available resource will be used as the limit by default.

- To change this default configuration, Add this environment variable into the `.env.local` file:
  ```
  # For example to change it to use 80% of the system's resources instead
  D2E_RESOURCE_LIMIT=0.8
  ```

For `D2E_SWAP_LIMIT`, 4 times the value provided by D2E_MEMORY_LIMIT will be used by default.

- To change this default configuration, Add this environment variable into the `.env.local` file:
  ```
  # For example to change it to use 2 times the value provided by D2E_MEMORY_LIMIT
  D2E_MEM_TO_SWAP_LIMIT_RATIO=2
  ```

---
