# Supabase Storage - Offline Capable Image

## Overview

This directory contains a customized Dockerfile based on the official `supabase/storage-api:v1.14.5` image.

## Why This Custom Image?

The official Supabase Storage image requires `postgresql-client` to run database setup commands via `psql`. The original docker-compose configuration installed this at **runtime** using:

```bash
apk add --no-cache postgresql-client
```

This approach **requires internet connectivity** during container startup, which prevents deployment in:
- 🔒 Air-gapped environments
- 🏢 Restricted corporate networks
- 🌐 Offline/no-internet scenarios

## Solution

This custom image pre-installs `postgresql-client` at **build time**, eliminating the runtime internet dependency.
