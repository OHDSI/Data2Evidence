import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(__dirname, "../docker-compose.yml"), "utf8");
writeFileSync(
  join(__dirname, "docker-compose-embed.ts"),
  `export const dockerComposeContent = ${JSON.stringify(content)};\n`
);
