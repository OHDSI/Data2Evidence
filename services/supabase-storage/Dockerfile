# Dockerfile for offline-capable Supabase Storage
# Extends official supabase/storage-api with postgresql-client pre-installed
FROM supabase/storage-api:v1.14.5

# Install postgresql-client at build time
# This requires internet during image build, but NOT during container startup
RUN apk add --no-cache postgresql-client

USER node
WORKDIR /app
