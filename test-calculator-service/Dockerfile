FROM denoland/deno:alpine-1.40.0

WORKDIR /app
COPY src/ ./src/

EXPOSE 8000

CMD ["deno", "run", "--allow-net", "src/server.ts"]
