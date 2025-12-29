#!/usr/bin/env node
import { config as dotenvConfig } from "dotenv";
import { spawn } from "child_process";
import { Command } from "commander";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";
import * as readline from "readline";
import { execSync, spawnSync } from "child_process";
import { LibUtils } from "./lib";

interface CliOptions {
  functionPath?: string;
  demo?: boolean;
  minio?: boolean;
  dicom?: boolean;
  jupyter?: boolean;
  mlflow?: boolean;
  composeFile?: string;
  dockerContext?: string;
  version?: string;
  args?: string;
  envFile?: string;
  port?: string;
  services?: string;
  hana?: boolean;
  pull?: boolean;
  ENVFILE?: string;
}

class D2ECli {
  version: string;
  LATEST_DOCKER_TAG_NAME: string = "0.10.0-beta";
  default_version: string = "0.10.0";
  CADDY__CONFIG: string;
  ENV_TYPE: string;
  DOCKER_LOG_LEVEL: string;
  node_modules_path: string;
  script_full_path: string;
  program: Command;
  port: string;
  ENVFILE: string;
  CADDY__ALP__PUBLIC_FQDN: string;
  TLS__CADDY_DIRECTIVE: string;
  PROJECT_NAME: string;
  DOCKER_TAG_NAME: string;
  PLUGINS_API_VERSION: string;
  PLUGINS_IMAGE_TAG: string;
  PLUGINS_REGISTRY: string;
  DEFAULT_PASSWORD_LENGTH: number;
  SUPABASE_STORAGE_JWT_SECRET: string;
  SUPABASE_STORAGE_JWT_TOKEN: string;
  DOTENV_KEYS: string;
  hanapw: string;
  DOCKER_IMAGE_PREFIX: string;
  libUtils: LibUtils;

  constructor() {
    this.script_full_path = path.resolve(__dirname, "..");
    this.node_modules_path = this.initialise_node_modules_path();
    this.program = new Command();
    this.libUtils = new LibUtils();
    this.install_options();
  }

  // Functions
  load_env_variables(): void {
    if (this.version == "develop") {
      this.PLUGINS_API_VERSION = process.env.PLUGINS_API_VERSION ?? "latest";
      this.DOCKER_TAG_NAME = process.env.DOCKER_TAG_NAME ?? "develop";
      this.PLUGINS_IMAGE_TAG = process.env.PLUGINS_IMAGE_TAG ?? "develop";
      this.DOCKER_LOG_LEVEL = "INFO";
      this.PLUGINS_REGISTRY =
        process.env.PLUGINS_REGISTRY ??
        "https://pkgs.dev.azure.com/data2evidence/d2e/_packaging/d2e/npm/registry/";
    } else {
      this.PLUGINS_API_VERSION =
        process.env.PLUGINS_API_VERSION ?? `${this.version}`;
      this.DOCKER_TAG_NAME =
        process.env.DOCKER_TAG_NAME ?? `${this.LATEST_DOCKER_TAG_NAME}`;
      this.PLUGINS_IMAGE_TAG =
        process.env.PLUGINS_IMAGE_TAG ?? `${this.LATEST_DOCKER_TAG_NAME}`;
      this.DOCKER_LOG_LEVEL = process.env.DOCKER_LOG_LEVEL || "ERROR";
      this.PLUGINS_REGISTRY =
        process.env.PLUGINS_REGISTRY ??
        "https://pkgs.dev.azure.com/data2evidence/d2e/_packaging/stable/npm/registry/";
    }
    process.env.PLUGINS_REGISTRY = this.PLUGINS_REGISTRY;
    process.env.PLUGINS_IMAGE_TAG = this.PLUGINS_IMAGE_TAG;
    process.env.DOCKER_TAG_NAME = this.DOCKER_TAG_NAME;
    process.env.PLUGINS_API_VERSION = this.PLUGINS_API_VERSION;
  }

  async write_env_file_variable(options: CliOptions): Promise<void> {
    this.DOTENV_KEYS = `${this.ENVFILE}.keys`;
    const LOGTO_API_M2M_CLIENT_ID = `${this.generate_random_password(21)}`;
    const LOGTO_API_M2M_CLIENT_SECRET = `${this.generate_random_password(30)}`;
    const LOGTO__CLIENTID_PASSWORD__BASIC_AUTH = Buffer.from(
      `${LOGTO_API_M2M_CLIENT_ID}:${LOGTO_API_M2M_CLIENT_SECRET}`
    ).toString("base64");
    console.log(
      `. INFO generate public & private keys - DB_CREDENTIALS__INTERNAL`
    );
    const DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE =
      this.generate_random_password(41);

    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
        cipher: "aes-256-cbc",
        passphrase: DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE,
      },
    });
    const keyObject = crypto.createPrivateKey({
      key: privateKey,
      passphrase: DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE,
    });
    const DB_CREDENTIALS__INTERNAL__DECRYPT_PRIVATE_KEY = keyObject.export({
      type: "pkcs8",
      format: "pem",
    }) as string;

    const DB_CREDENTIALS__INTERNAL__PUBLIC_KEY = publicKey;

    this.SUPABASE_STORAGE_JWT_SECRET = this.generate_random_secret();
    const ROLE = "service_role";
    const ISSUER = "supabase";
    this.SUPABASE_STORAGE_JWT_TOKEN = this.generate_jwt(
      this.SUPABASE_STORAGE_JWT_SECRET,
      ROLE,
      ISSUER
    );
    const envVariables = {
      CADDY__ALP__PUBLIC_FQDN: `${this.CADDY__ALP__PUBLIC_FQDN}`,
      DOCKER_TAG_NAME: `${this.DOCKER_TAG_NAME}`,
      ENV_TYPE: `${this.ENV_TYPE}`,
      FHIR__CLIENT_ID: `${this.generate_uuid()}`,
      FHIR__CLIENT_SECRET: `${this.generate_random_password(64)}`,
      LOGTO__ALP_APP__CLIENT_ID: `${this.generate_random_password(21)}`,
      LOGTO__ALP_APP__CLIENT_SECRET: `${this.generate_random_password(30)}`,
      LOGTO__ALP_DATA__CLIENT_ID: `${this.generate_random_password(21)}`,
      LOGTO__ALP_DATA__CLIENT_SECRET: `${this.generate_random_password(30)}`,
      LOGTO__ALP_SVC__CLIENT_ID: `${this.generate_random_password(21)}`,
      LOGTO__ALP_SVC__CLIENT_SECRET: `${this.generate_random_password(30)}`,
      LOGTO_API_M2M_CLIENT_ID: `${LOGTO_API_M2M_CLIENT_ID}`,
      LOGTO_API_M2M_CLIENT_SECRET: `${LOGTO_API_M2M_CLIENT_SECRET}`,
      MINIO__SECRET_KEY: `${this.generate_random_password(
        this.DEFAULT_PASSWORD_LENGTH
      )}`,
      PG_ADMIN_PASSWORD: `${this.generate_random_password(
        this.DEFAULT_PASSWORD_LENGTH
      )}`,
      PG_SUPER_PASSWORD: `${this.generate_random_password(
        this.DEFAULT_PASSWORD_LENGTH
      )}`,
      PG_WRITE_PASSWORD: `${this.generate_random_password(
        this.DEFAULT_PASSWORD_LENGTH
      )}`,
      PG_STUDY_RESULTS_ADMIN_PASSWORD: `${this.generate_random_password(
        this.DEFAULT_PASSWORD_LENGTH
      )}`,
      PG_STUDY_RESULTS_READ_PASSWORD: `${this.generate_random_password(
        this.DEFAULT_PASSWORD_LENGTH
      )}`,
      DEMO__DB_PASSWORD: `${this.generate_random_password(6)}`,
      REDIS_PASSWORD: `${this.generate_random_password(
        this.DEFAULT_PASSWORD_LENGTH
      )}`,
      DICOM__HEALTH_CHECK_PASSWORD: `${this.generate_random_password(
        this.DEFAULT_PASSWORD_LENGTH
      )}`,
      TLS__CADDY_DIRECTIVE: `${this.TLS__CADDY_DIRECTIVE}`,
      SUPABASE_STORAGE_JWT_SECRET: `${this.SUPABASE_STORAGE_JWT_SECRET}`,
      SUPABASE_STORAGE_JWT_TOKEN: `${this.SUPABASE_STORAGE_JWT_TOKEN}`,
      PROJECT_NAME: `${this.PROJECT_NAME}`,
      TREX__SQL__PASSWORD: `${this.generate_random_password(
        this.DEFAULT_PASSWORD_LENGTH
      )}`,
      LOGTO__CLIENTID_PASSWORD__BASIC_AUTH: `${LOGTO__CLIENTID_PASSWORD__BASIC_AUTH}`,
      PG__LOGTO_MANAGER_PASSWORD: `${this.generate_random_password(
        this.DEFAULT_PASSWORD_LENGTH
      )}`,
      DB_CREDENTIALS__INTERNAL__DECRYPT_PRIVATE_KEY:
        DB_CREDENTIALS__INTERNAL__DECRYPT_PRIVATE_KEY.trim(),
      DB_CREDENTIALS__INTERNAL__PUBLIC_KEY:
        DB_CREDENTIALS__INTERNAL__PUBLIC_KEY.trim(),
    };

    const envContent = Object.entries(envVariables)
      .map(([key, value]) => {
        if (key.includes("DECRYPT_PRIVATE_KEY") || key.includes("PUBLIC_KEY")) {
          return `${key}='${value}'`;
        }
        return `${key}=${value}`;
      })
      .join("\n");
    fs.writeFileSync(this.ENVFILE, envContent + "\n");
    this.set_cpu_limit(this.ENVFILE, this.node_modules_path);
    this.set_memory_limit(this.ENVFILE, this.node_modules_path);
    this.gen_tls_internal(this.ENVFILE, this.node_modules_path);
    const content = fs.readFileSync(this.ENVFILE, "utf-8");
    const keys = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes("="))
      .map((line) => line.split("=")[0].trim())
      .filter((key) => key.includes("_"))
      .filter((key, i, arr) => arr.indexOf(key) === i)
      .sort();

    fs.writeFileSync(this.DOTENV_KEYS, keys.join("\n"));

    const counts = [
      { file: this.ENVFILE, lines: this.countLinesSync(this.ENVFILE) },
      { file: this.DOTENV_KEYS, lines: this.countLinesSync(this.DOTENV_KEYS) },
    ];
    for (const { file, lines } of counts) {
      console.log(`${lines} ${file}`);
    }
    console.log("File written successfully");
  }
  countLinesSync(filePath: string): number {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.trimEnd().split("\n").length;
  }
  install_options(): void {
    this.program
      .description("Usage: d2e [OPTIONS] COMMAND")
      .option(
        "-d, --function-path <path>",
        "[PATH] Development mode. [PATH] is the path to functions"
      )
      .option("-e, --demo", "Include demo database")
      .option("-i, --dicom", "Include DICOM Server")
      .option("-j, --jupyter", "Include jupyter")
      .option("-m, --mlflow", "Include mlflow")
      .option("-h, --hana", "")
      .option(
        "-c, --compose-file",
        "[PATH] is path to an additional docker compose file"
      )
      .option("-t, --docker-context <context>", "[CONTEXT] Use docker context")
      .option(
        "-v, --version <version>",
        "[VERSION] Version of the d2e services to use"
      )
      .option(
        "-a, --args <arguments>",
        "[ARGUMENTS] Additional arguments for docker-compose"
      )
      .option("-n, --env-file <file>", "[FILE] Path to environment file")
      .option("-p, --port <port>", "[PORT] Port number to use")
      .option(
        "-s, --services <services>",
        "[SERVICES] Comma-separated list of services to start/stop"
      )
      .option(
        "--pull",
        "Always pull the latest images before starting services"
      );
  }
  initialise_node_modules_path(): string {
    let file_name = path.basename(__filename);
    if (process.env.D2ECLI_NODE_MODULES_PATH) {
      this.node_modules_path = process.env.D2ECLI_NODE_MODULES_PATH;
    } else if (
      fs.existsSync(
        path.join(this.script_full_path, "../lib/node_modules/d2e/")
      )
    ) {
      this.node_modules_path = path.join(
        this.script_full_path,
        "../lib/node_modules/d2e/"
      );
    } else if (fs.existsSync(path.join(this.script_full_path, "../d2e/"))) {
      this.node_modules_path = path.join(this.script_full_path, "../d2e/");
    } else if (
      fs.existsSync(
        path.join(this.script_full_path, "/../lib/node_modules/@ohdsi/d2e/")
      )
    ) {
      this.node_modules_path = path.join(
        this.script_full_path,
        "/../lib/node_modules/@ohdsi/d2e/"
      );
    } else if (
      fs.existsSync(path.join(this.script_full_path, "/../@ohdsi/d2e/"))
    ) {
      this.node_modules_path = path.join(
        this.script_full_path,
        "/../@ohdsi/d2e/"
      );
    } else if (
      fs.existsSync(
        path.join(
          this.script_full_path,
          "/../lib/node_modules/@data2evidence/cli/"
        )
      )
    ) {
      this.node_modules_path = path.join(
        this.script_full_path,
        "/../lib/node_modules/@data2evidence/cli/"
      );
    } else if (
      fs.existsSync(path.join(this.script_full_path, "/../@data2evidence/cli/"))
    ) {
      this.node_modules_path = path.join(
        this.script_full_path,
        "/../@data2evidence/cli/"
      );
    } else if (file_name === "cli.js") {
      this.node_modules_path = path.join(this.script_full_path, "/..");
    } else {
      console.log(
        `Can't find d2e cli node_modules dir. You can set D2ECLI_NODE_MODULES_PATH to define the path. Exiting`
      );
      process.exit(1);
    }
    return this.node_modules_path;
  }
  generate_random_secret(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 40; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  set_cpu_limit(DOTENV_FILE: string, nodeModulesPath: string) {
    this.libUtils.setCpuLimit(DOTENV_FILE);
  }
  set_memory_limit(DOTENV_FILE: string, nodeModulesPath: string) {
    this.libUtils.setMemoryLimit(DOTENV_FILE);
  }
  gen_tls_internal(DOTENV_FILE: string, nodeModulesPath: string) {
    this.libUtils.genTlsInternal(DOTENV_FILE);
  }

  generate_random_password(length: number): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charsLength = chars.length;
    let password = "";
    while (password.length < length) {
      // Draw one random byte at a time
      const byte = crypto.randomBytes(1)[0];
      // Only use the byte if it's within an unbiased range
      if (byte >= Math.floor(256 / charsLength) * charsLength) {
        continue; // Discard byte to avoid modulo bias
      }
      const index = byte % charsLength;
      password += chars[index];
    }
    return password;
  }

  generate_uuid(): string {
    return crypto.randomUUID();
  }

  base64UrlEncode(str: string | Buffer): string {
    const base64 = Buffer.isBuffer(str)
      ? str.toString("base64")
      : Buffer.from(str).toString("base64");
    return base64
      .replace(/=/g, "") // Remove '=' padding
      .replace(/\+/g, "_") // Replace '+' with '_'
      .replace(/\//g, "-") // Replace '/' with '-'
      .replace(/\n/g, ""); // Remove newlines
  }

  generate_jwt(secret: string, role: string, issuer: string): string {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 157788000; // 5 years expiration
    const header = this.base64UrlEncode(
      JSON.stringify({ alg: "HS256", typ: "JWT" })
    );
    const payloadObj = { role, issuer, iat, exp };
    const payload = this.base64UrlEncode(JSON.stringify(payloadObj));
    const data = `${header}.${payload}`;
    const signature = this.base64UrlEncode(
      crypto.createHmac("sha256", secret).update(data).digest()
    );
    return `${header}.${payload}.${signature}`;
  }

  build_docker_command(
    options: CliOptions,
    command: string
  ): { cmd: string; env: NodeJS.ProcessEnv } {
    const dockerbasecmd = ["docker"];
    dockerbasecmd.push("--log-level", this.DOCKER_LOG_LEVEL);
    dockerbasecmd.push("compose");
    dockerbasecmd.push(
      "--file",
      `${this.node_modules_path}/docker-compose.yml`
    );
    if (options.demo) dockerbasecmd.push("--profile", "demodb");
    if (options.dicom) dockerbasecmd.push("--profile", "dicom");
    if (options.jupyter) dockerbasecmd.push("--profile", "jupyter");
    if (options.mlflow) dockerbasecmd.push("--profile", "mlflow");
    if (options.hana) dockerbasecmd.push("--profile", "hana");
    if (options.minio) dockerbasecmd.push("--profile", "minio");
    if (options.functionPath) {
      const dev = `--file ${this.node_modules_path}/docker-compose-local.yml`;
      dockerbasecmd.push(dev);
    }
    dockerbasecmd.push("--env-file", this.ENVFILE);
    if (options.composeFile) dockerbasecmd.push("--file", options.composeFile);
    if (options.dockerContext)
      dockerbasecmd.push("--context", options.dockerContext);

    // Prepare environment variables separately
    const envVars = {
      ...process.env,
      PORT: this.port,
      CADDY__CONFIG: this.CADDY__CONFIG,
      ENV_TYPE: this.ENV_TYPE,
    };

    let cmd = dockerbasecmd.join(" ");
    if (command === "start") {
      cmd = `${cmd} up --force-recreate --wait`;
      if (options.pull) cmd += " --pull always";
      if (options.services) {
        let services = options.services;
        cmd += ` --no-deps ${services}`;
      }
    } else if (command === "stop") {
      cmd = `${cmd} stop`;
      if (options.services) {
        let services = options.services;
        cmd += ` ${services}`;
      }
    } else if (command === "build") {
      cmd = `${cmd} build`;
      if (options.services) {
        let services = options.services;
        cmd += ` ${services}`;
      }
    } else if (command === "status") {
      cmd = `${cmd} ps`;
    } else if (command === "logs") {
      cmd = `${cmd} logs -t`;
      if (options.services) {
        let services = options.services;
        cmd += ` ${services}`;
      }
    } else if (command === "config") {
      cmd = `${cmd} config`;
    } else if (command === "clean" || command === "cleanci") {
      cmd = `${cmd} down --volumes --remove-orphans`;
    } else if (command === "inithana") {
      cmd = `${cmd} run --rm hana --master-password ${this.hanapw} --agree-to-sap-license`;
    } else if (command === "pull") {
      cmd = `${cmd} pull`;
    }
    return { cmd, env: envVars };
  }

  user_input(query: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) =>
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
      })
    );
  }
  setup_zx_cmd() {
    console.log("Setting up zx command...");
    let zx_cmd: string;
    const zxBin = path.join(
      `${this.node_modules_path}`,
      "node_modules",
      ".bin",
      "zx"
    );
    const zxCliJs = path.join(
      `${this.node_modules_path}`,
      "node_modules",
      "zx",
      "build",
      "cli.js"
    );

    if (fs.existsSync(zxCliJs)) {
      zx_cmd = `node ${zxCliJs}`;
      return zx_cmd;
    } else if (fs.existsSync(zxBin)) {
      zx_cmd = process.platform === "win32" ? `${zxBin}.cmd` : zxBin;
      return zx_cmd;
    } else {
      console.error("Error: zx not found in node_modules");
      process.exit(1);
    }
  }
  patch_demodb() {
    console.log("Patching demodb...");
    const database_host = `${this.PROJECT_NAME}-demodb`;
    const command = `docker exec ${database_host} psql -h localhost -U postgres -c "SET search_path TO demo_cdm; CREATE TABLE IF NOT EXISTS cohort (cohort_definition_id integer NOT NULL,subject_id integer NOT NULL,cohort_start_date DATE NOT NULL,cohort_end_date DATE NOT NULL)"`;
    try {
      const options: any = {
        stdio: "inherit",
        encoding: "utf-8",
      };
      if (process.platform !== "win32") {
        options.shell = "/bin/bash";
      }
      execSync(command, options);
    } catch (error) {
      console.error("Error running patch_demodb:", error);
    }
  }
  setupdemo() {
    console.log("Setting up demo database...");
    this.patch_demodb();
    const database_host = `${this.PROJECT_NAME}-demodb`;
    const zx_cmd = this.setup_zx_cmd();
    const setupdemoCmd = `${zx_cmd} ${this.node_modules_path}/scripts/setupdemo.mjs -n ${this.ENVFILE}`;
    const setupdemo = spawnSync(setupdemoCmd, [], {
      env: { ...process.env, PORT: this.port },
      stdio: "inherit",
      shell: true,
    });
    if (setupdemo.error || setupdemo.status !== 0) {
      console.error("Failed to run script:", setupdemo.error);
      process.exit(1);
    }

    const checkSetupDemoCmd = `${zx_cmd} ${this.node_modules_path}/scripts/check-setupdemo-flow.mjs -n ${this.ENVFILE}`;
    const check_setupdemo = spawnSync(checkSetupDemoCmd, [], {
      env: { ...process.env, PORT: this.port },
      stdio: "inherit",
      shell: true,
    });
    if (check_setupdemo.error || check_setupdemo.status !== 0) {
      console.error("Failed to run script:", check_setupdemo.error);
      process.exit(1);
    }
  }

  setupdemohana() {
    console.log("Setting up demo database for hana...");
    const zx_cmd = this.setup_zx_cmd();
    const setupdemohanaCmd = `${zx_cmd} ${this.node_modules_path}/scripts/setupdemohana.mjs -n ${this.ENVFILE}`;
    const setupdemohana = spawnSync(setupdemohanaCmd, [], {
      env: { ...process.env, PORT: this.port },
      stdio: "inherit",
      shell: true,
    });
    if (setupdemohana.error || setupdemohana.status !== 0) {
      console.error("Failed to run script:", setupdemohana.error);
      process.exit(1);
    }

    const checkSetupDemohanaCmd = `${zx_cmd} ${this.node_modules_path}/scripts/check-setupdemohana-flow.mjs -n ${this.ENVFILE}`;
    const check_setupdemohana = spawnSync(checkSetupDemohanaCmd, [], {
      env: { ...process.env, PORT: this.port },
      stdio: "inherit",
      shell: true,
    });
    if (check_setupdemohana.error || check_setupdemohana.status !== 0) {
      console.error("Failed to run script:", check_setupdemohana.error);
      process.exit(1);
    }
  }

  checkflow() {
    console.log("Checking flow...");
    const zx_cmd = this.setup_zx_cmd();
    const checkflowCmd = `${zx_cmd} ${this.node_modules_path}/scripts/check-setupdemo-flow.mjs -n ${this.ENVFILE} -b ${this.PROJECT_NAME}-demodb`;
    const checkflow = spawnSync(checkflowCmd, [], {
      env: { ...process.env, PORT: this.port },
      stdio: "inherit",
      shell: true,
    });
    if (checkflow.error) {
      console.error("Failed to run script:", checkflow.error);
      process.exit(1);
    }
  }

  getnoproxy() {
    const zx_cmd = this.setup_zx_cmd();
    const getnoproxyCmd = `${zx_cmd} ${this.node_modules_path}/scripts/get-noproxy.mjs --script_full_path ${this.node_modules_path}`;
    const getnoproxy = spawnSync(getnoproxyCmd, [], {
      env: { ...process.env, DOTENV_FILE: this.ENVFILE, PORT: this.port },
      stdio: "inherit",
      shell: true,
    });
    if (getnoproxy.error) {
      console.error("Failed to run script:", getnoproxy.error);
      process.exit(1);
    }
  }

  // Commands
  setup_commands(): void {
    this.program
      .command("init")
      .description("Initialize d2e services")
      .action(async () => {
        console.log("Initializing services...");
        let init_choice: string;
        if (process.env.init_choice) {
          console.log(
            "CI environment detected. Auto-accepting to overwite all values in .env file..."
          );
          init_choice = "y";
        } else {
          init_choice = await this.user_input(
            "WARNING: Re-running this command again will require you to run `d2e clean` to remove all existing containers and volumes before starting services again with `d2e start`.\nDo you wish to overwrite .env file? (y/n): "
          );
        }
        if (init_choice.toLowerCase() !== "y") {
          console.log(
            "Aborting initialization to prevent overwriting .env file."
          );
          return;
        }
        this.load_env_variables();
        this.write_env_file_variable(this.program.opts());
      });
    this.program
      .command("start")
      .description(
        "Starts d2e services. Requires d2e init and d2e setup to be run."
      )
      .action(async () => {
        console.log("Starting services...");
        dotenvConfig({ path: this.ENVFILE });
        this.load_env_variables();
        const { cmd, env } = this.build_docker_command(
          this.program.opts(),
          "start"
        );
        console.log(`Executing command: ${cmd}`);
        const proc = spawn(cmd, {
          stdio: "inherit",
          shell: true,
          env: env,
        });
        proc.on("close", (code) => {
          if (code === 0) {
            console.log("Process completed successfully.");
          } else {
            console.log(`Process exited with code ${code}`);
          }
        });
      });

    const inithana_cmd = this.program
      .command("inithana")
      .description("Initialise hana services")
      .action(async () => {
        dotenvConfig({ path: this.ENVFILE });
        this.load_env_variables();
        console.log("Starting services...");
        console.log("This will initialize SAP HANA Express Edition.");
        console.log("By proceeding, you agree to the SAP License Agreement.");
        console.log(
          "You can view the license at: https://www.sap.com/docs/download/cmp/2016/06/sap-hana-express-dev-agmt-and-exhibit.pdf"
        );
        let license_agreement: string;
        if (process.env.ACCEPT_SAP_LICENSE) {
          console.log(
            "CI environment detected. Auto-accepting SAP license terms..."
          );
          license_agreement = "y";
        } else {
          license_agreement = await this.user_input(
            "Do you agree to the SAP license terms and want to continue? (y/N): "
          );
        }
        if (
          license_agreement.toLowerCase() === "y" ||
          license_agreement.toLowerCase() === "yes"
        ) {
          console.log(
            "License accepted. Proceeding with HANA initialization..."
          );
        } else {
          console.log("License not accepted. Aborting HANA initialization.");
          return;
        }
        const hanapw =
          process.env.HANAPW || `${this.generate_random_password(16)}`;
        this.hanapw = hanapw;
        const envVariables = {
          HANA_SYSTEM_PASSWORD: this.hanapw,
          INSTALL_SQLALCHEMY:
            "\"bash -c 'if [[ $INSTALL_SQLALCHEMY_HANA = true ]]; then uv pip install sqlalchemy-hana==2.2.0 && prefect flow-run execute; else prefect flow-run execute; fi'\"",
        };
        const envContent = Object.entries(envVariables)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n");
        fs.writeFileSync(this.ENVFILE, envContent, { flag: "a" });
        const { cmd, env } = this.build_docker_command(
          this.program.opts(),
          "inithana"
        );
        console.log(`Executing command: ${cmd}`);
        const proc = spawn(cmd, {
          stdio: "inherit",
          shell: true,
          env: env,
        });
        proc.on("close", (code) => {
          if (code === 0) {
            console.log("Process completed successfully.");
          } else {
            console.log(`Process exited with code ${code}`);
          }
        });
      });
    (inithana_cmd as any)._hidden = true;

    this.program
      .command("stop")
      .description("Stop d2e services")
      .action(async () => {
        console.log("Stopping services...");
        dotenvConfig({ path: this.ENVFILE });
        this.load_env_variables();
        const { cmd, env } = this.build_docker_command(
          this.program.opts(),
          "stop"
        );
        console.log(`Executing command: ${cmd}`);
        const proc = spawn(cmd, {
          stdio: "inherit",
          shell: true,
          env: env,
        });
        proc.on("close", (code) => {
          if (code === 0) {
            console.log("Process completed successfully.");
          } else {
            console.log(`Process exited with code ${code}`);
          }
        });
      });
    const build_cmd = this.program
      .command("build")
      .description("Build d2e services")
      .action(async () => {
        dotenvConfig({ path: this.ENVFILE });
        console.log("Building services...");
        this.load_env_variables();
        const { cmd, env } = this.build_docker_command(
          this.program.opts(),
          "build"
        );
        console.log(`Executing command: ${cmd}`);
        const proc = spawn(cmd, {
          stdio: "inherit",
          shell: true,
          env: env,
        });
        proc.on("close", (code) => {
          if (code === 0) {
            console.log("Process completed successfully.");
          } else {
            console.log(`Process exited with code ${code}`);
          }
        });
      });
    (build_cmd as any)._hidden = true;
    const status_cmd = this.program
      .command("status")
      .description("Status of d2e services")
      .action(async () => {
        dotenvConfig({ path: this.ENVFILE });
        this.load_env_variables();
        const { cmd, env } = this.build_docker_command(
          this.program.opts(),
          "status"
        );
        console.log(`Executing command: ${cmd}`);
        const proc = spawn(cmd, {
          stdio: "inherit",
          shell: true,
          env: env,
        });
        proc.on("close", (code) => {
          if (code === 0) {
            console.log("Process completed successfully.");
          } else {
            console.log(`Process exited with code ${code}`);
          }
        });
      });
    (status_cmd as any)._hidden = true;
    const logs_cmd = this.program
      .command("logs")
      .description("View logs of d2e services")
      .action(async () => {
        dotenvConfig({ path: this.ENVFILE });
        this.load_env_variables();
        const { cmd, env } = this.build_docker_command(
          this.program.opts(),
          "logs"
        );
        console.log(`Executing command: ${cmd}`);
        const proc = spawn(cmd, {
          stdio: "inherit",
          shell: true,
          env: env,
        });
        proc.on("close", (code) => {
          if (code === 0) {
            console.log("Process completed successfully.");
          } else {
            console.log(`Process exited with code ${code}`);
          }
        });
      });
    (logs_cmd as any)._hidden = true;

    const config_cmd = this.program
      .command("config")
      .description("View configuration of d2e services")
      .action(async () => {
        dotenvConfig({ path: this.ENVFILE });
        this.load_env_variables();
        const { cmd, env } = this.build_docker_command(
          this.program.opts(),
          "config"
        );
        console.log(`Executing command: ${cmd}`);
        const proc = spawn(cmd, {
          stdio: ["ignore", "inherit", "ignore"],
          shell: true,
          env: env,
        });
        proc.on("close", (code) => {
          if (code === 0) {
            console.log("Process completed successfully.");
          } else {
            console.log(`Process exited with code ${code}`);
          }
        });
      });
    (config_cmd as any)._hidden = true;

    this.program
      .command("clean")
      .description("Removes d2e docker containers and volumes")
      .action(async () => {
        dotenvConfig({ path: this.ENVFILE });
        this.load_env_variables();
        const user_input_init = await this.user_input(
          "This action will delete all docker containers and volumes. Continue (y/n)? "
        );
        if (user_input_init.toLowerCase() !== "y") {
          console.log("Aborting cleanup.");
          return;
        }
        const { cmd, env } = this.build_docker_command(
          this.program.opts(),
          "clean"
        );
        console.log(`Executing command: ${cmd}`);
        const proc = spawn(cmd, {
          stdio: "inherit",
          shell: true,
          env: env,
        });
        proc.on("close", (code) => {
          if (code === 0) {
            console.log("Process completed successfully.");
          } else {
            console.log(`Process exited with code ${code}`);
          }
        });
      });
    const cleanci_cmd = this.program
      .command("cleanci")
      .description("Clean up d2e services")
      .action(async () => {
        dotenvConfig({ path: this.ENVFILE });
        this.load_env_variables();
        const { cmd, env } = this.build_docker_command(
          this.program.opts(),
          "cleanci"
        );
        console.log(`Executing command: ${cmd}`);
        const proc = spawn(cmd, {
          stdio: "inherit",
          shell: true,
          env: env,
        });
        proc.on("close", (code) => {
          if (code === 0) {
            console.log("Process completed successfully.");
          } else {
            console.log(`Process exited with code ${code}`);
          }
        });
      });
    (cleanci_cmd as any)._hidden = true;

    const patchdemodb_cmd = this.program
      .command("patchdemodb")
      .description("Patch demo database")
      .action(async () => {
        dotenvConfig({ path: this.ENVFILE });
        this.load_env_variables();
        this.patch_demodb();
      });
    (patchdemodb_cmd as any)._hidden = true;
    const pull_cmd = this.program
      .command("pull")
      .description("Pull images for d2e services")
      .action(async () => {
        dotenvConfig({ path: this.ENVFILE });
        this.load_env_variables();
        const options = this.program.opts();
        let DOCKER_IMAGE_PREFIX =
          process.env.DOCKER_IMAGE_PREFIX || "ghcr.io/ohdsi/";
        this.DOCKER_IMAGE_PREFIX = DOCKER_IMAGE_PREFIX;
        const cmd_pull_flow_base = `docker pull --platform linux/amd64 ${DOCKER_IMAGE_PREFIX}d2e/flow-base:${this.PLUGINS_IMAGE_TAG}`;
        await new Promise<void>((resolve) => {
          const proc = spawn(cmd_pull_flow_base, {
            stdio: "inherit",
            shell: true,
            env: process.env,
          });
          proc.on("close", (code) => {
            if (code === 0) {
              console.log("Process completed successfully.");
            } else {
              console.log(`Process exited with code ${code}`);
            }
            resolve();
          });
        });
        if (options.jupyter) {
          const cmd_pull_jupyter = `docker pull --platform linux/amd64 ${this.DOCKER_IMAGE_PREFIX}d2e-r-ohdsi-kernel:${this.DOCKER_TAG_NAME}`;
          await new Promise<void>((resolve) => {
            const proc = spawn(cmd_pull_jupyter, {
              stdio: "inherit",
              shell: true,
              env: process.env,
            });
            proc.on("close", (code) => {
              if (code === 0) {
                console.log("Process completed successfully.");
              } else {
                console.log(`Process exited with code ${code}`);
              }
              resolve();
            });
          });
        }
        const { cmd, env } = this.build_docker_command(options, "pull");
        console.log(`Executing command: ${cmd}`);
        const proc1 = spawn(cmd, {
          stdio: "inherit",
          shell: true,
          env: env,
        });
        proc1.on("close", (code) => {
          if (code === 0) {
            console.log("Process completed successfully.");
          } else {
            console.log(`Process exited with code ${code}`);
          }
        });
      });
    (pull_cmd as any)._hidden = true;
    this.program
      .command("setupdemo")
      .description(
        "Load d2e services. Requires d2e init and d2e setup to be run."
      )
      .action(async () => {
        this.setupdemo();
      });

    this.program
      .command("setupdemohana")
      .description(
        "Load d2e services for hana. Requires d2e init and d2e setup to be run."
      )
      .action(async () => {
        this.setupdemohana();
      });
    const checkflow_cmd = this.program
      .command("checkflow")
      .description("Check setupdemo flow")
      .action(async () => {
        console.log("Checking setupdemo flow...");
        this.checkflow();
      });
    (checkflow_cmd as any)._hidden = true;
    const getnoproxy_cmd = this.program
      .command("getnoproxy")
      .description("Getting noproxy for d2e services")
      .action(async () => {
        console.log("Getting no proxy setup...");
        this.getnoproxy();
      });
    (getnoproxy_cmd as any)._hidden = true;
  }

  run(): void {
    this.setup_commands();
    this.program.parseOptions(process.argv);
    const options = this.program.opts();
    this.ENVFILE = options.envFile ?? ".env";
    this.DEFAULT_PASSWORD_LENGTH = 30;
    this.PROJECT_NAME = process.env.PROJECT_NAME || "d2e";
    this.ENV_TYPE = process.env.ENV_TYPE || "remote";
    this.CADDY__ALP__PUBLIC_FQDN =
      process.env.CADDY__ALP__PUBLIC_FQDN || "localhost";
    this.TLS__CADDY_DIRECTIVE =
      process.env.TLS__CADDY_DIRECTIVE || "tls internal";
    this.version = options?.version ?? this.default_version;
    this.CADDY__CONFIG = process.env.CADDY__CONFIG || "./deploy/caddy-config";
    this.port = options.port || process.env.PORT || "";
    this.program.parse(process.argv);
  }
}

const d2e = new D2ECli();
d2e.run();
