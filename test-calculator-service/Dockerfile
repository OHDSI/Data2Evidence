FROM denoland/deno:alpine-1.40.0

WORKDIR /app
COPY src/ ./src/

EXPOSE 8080

CMD ["run", "--allow-net", "--allow-env", "src/server.ts"]
