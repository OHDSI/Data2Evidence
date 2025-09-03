#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

// Recursively copy a directory using Deno APIs
async function copyDir(src: string, dest: string) {
  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;
    if (entry.isDirectory) {
      await Deno.mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath);
    } else if (entry.isFile) {
      await Deno.copyFile(srcPath, destPath);
    }
  }
}

async function copy_config_files(d2e_fhirPath: string, dest: string) {
    console.log("Processing configuration file...");
    try {
        const configPath = d2e_fhirPath + "/config.json";
        const configRaw = await Deno.readTextFile(configPath);
        const replaced = configRaw.replace(/\$\{([A-Z0-9_]+)\}/g, (_, k) => Deno.env.get(k) ?? "");
        let config = JSON.parse(replaced);
        if (config.database && config.database.port) config.database.port = Number(config.database.port);
        if (config.redis && config.redis.port) config.redis.port = Number(config.redis.port);
        await Deno.writeTextFile(d2e_fhirPath + "/temp.json", JSON.stringify(config, null, 2));
        await Deno.copyFile(d2e_fhirPath + "/temp.json", dest + "/medplum.config.json");
        await Deno.copyFile(d2e_fhirPath + "/deno_medplum.json", dest + "/deno.json");
        console.log("Configuration file processed and copied");
    } catch (err) {
        console.error("Error processing configuration file:", err);
    }
}
async function main() {
    console.log("Copying Medplum server plugin folder...");
    try {
        const src = "/usr/src/data/plugins/node_modules/@data2evidence/d2e-medplum-server";
        const dest = "/usr/src/plugins/d2ef/d2e-medplum-server";
        const d2e_fhirPath = "/usr/src/plugins/d2ef/d2e-fhir";
        await Deno.remove(dest, { recursive: true }).catch(() => {}); // Remove if exists
        await Deno.mkdir(dest, { recursive: true });
        await copyDir(src, dest);
        await copy_config_files(d2e_fhirPath, dest);
    } catch (err) {
        console.error("Error copying Medplum plugin folder:", err);
    }
}
main();