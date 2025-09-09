import { env } from "./env.ts";
import { dirname, fromFileUrl } from "https://deno.land/std@0.203.0/path/mod.ts";

async function copyDir(src: string, dest: string) {
  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;
    let stat;
    try {
      stat = await Deno.lstat(srcPath);
    } catch (err) {
      console.error(`[copyDir] Failed to stat: ${srcPath}`, err);
      continue;
    }
    if (stat.isDirectory) {
      await Deno.mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath);
    } else if (stat.isFile) {
      await copyFileStream(srcPath, destPath);
    }
  }
}

async function copy_config_files(d2e_fhirPath: string, dest: string) {
  console.log("Processing configuration file...");
  try {
    const configPath = d2e_fhirPath + "/config.json";
    console.log(configPath)
    const configRaw = await Deno.readTextFile(configPath);
    const replaced = configRaw.replace(/\$\{([A-Z0-9_]+)\}/g, (_, k) => Deno.env.get(k) ?? "");
    let config = JSON.parse(replaced);
    if (config.database && config.database.port) config.database.port = Number(config.database.port);
    if (config.redis && config.redis.port) config.redis.port = Number(config.redis.port);
    await Deno.writeTextFile(d2e_fhirPath + "/temp.json", JSON.stringify(config, null, 2));
    await copyFileStream(d2e_fhirPath + "/temp.json", dest + "/medplum.config.json");
    await copyFileStream(d2e_fhirPath + "/deno_medplum.json", dest + "/deno.json");
    console.log("Configuration file processed and copied");
  } catch (err) {
    console.error("Error processing configuration file:", err);
  }
}

async function main() {
  try {
    const src = env.MEDPLUM_PLUGIN_PATH;
    const dest = env.FHIR_FUNCTIONS_PLUGIN_PATH + "d2e-medplum-server";
    //await Deno.remove(dest, { recursive: true }).catch(() => {});
    //await Deno.mkdir(dest, { recursive: true });
    //await copyDir(src, dest);
    const d2e_fhirPath = env.FHIR_FUNCTIONS_PLUGIN_PATH + "alp-fhir-init/src/preStart";
    await copy_config_files(d2e_fhirPath, dest);
    console.log("Medplum plugin files and config copied successfully.");
  } catch (err) {
    console.error("Error copying Medplum plugin folder:", err);
  }
}

async function copyFileStream(srcPath: string, destPath: string) {
  const srcFile = await Deno.open(srcPath, { read: true });
  const destFile = await Deno.open(destPath, { write: true, create: true, truncate: true });
  await srcFile.readable.pipeTo(destFile.writable);
}

main();