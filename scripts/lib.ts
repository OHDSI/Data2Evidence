import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import { execSync } from "child_process";

export class LibUtils {
  private D2E_MEM_TO_SWAP_LIMIT_RATIO: number;
  private D2E_RESOURCE_LIMIT: number;
  private TLS__INTERNAL__DOMAIN_NAME: string;
  private TLS__X509__SUBJ_BASE: string;
  private DEFAULT_PASSWORD_LENGTH: number = 30;
  private OS: string;

  constructor() {
    this.D2E_MEM_TO_SWAP_LIMIT_RATIO = parseInt(
      process.env.D2E_MEM_TO_SWAP_LIMIT_RATIO || "4"
    );
    this.D2E_RESOURCE_LIMIT = parseFloat(
      process.env.D2E_RESOURCE_LIMIT || "0.7"
    );
    this.TLS__INTERNAL__DOMAIN_NAME =
      process.env.TLS__INTERNAL__DOMAIN_NAME || "d2e.local";
    this.TLS__X509__SUBJ_BASE =
      process.env.TLS__X509__SUBJ_BASE || "/C=SG/O=D4L/OU=D2E";
    this.OS = this.detectOS();
  }

  detectOS(): string {
    const platform = process.platform;
    if (platform === "linux") return "Linux";
    if (platform === "darwin") return "Darwin";
    if (platform === "win32") return "Windows_NT";
    return os.type();
  }

  randomPassword(passwordLength: number): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.randomBytes(passwordLength);
    let password = "";
    for (let i = 0; i < passwordLength; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }

  setCpuLimit(dotenvFile: string): void {
    console.log(". INFO set cpu limit");

    try {
      let nprocs: number;

      if (this.OS === "Linux") {
        const result = execSync("nproc --all", {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        nprocs = parseInt(result.trim());
      } else if (this.OS === "Darwin") {
        const result = execSync("sysctl -n hw.ncpu", { encoding: "utf-8" });
        nprocs = parseInt(result.trim());
      } else if (this.OS === "Windows_NT") {
        try {
          const result = execSync(
            "wmic cpu get NumberOfLogicalProcessors /value",
            { encoding: "utf-8" }
          );
          const match = result.match(/NumberOfLogicalProcessors=(\d+)/);
          nprocs = match
            ? parseInt(match[1])
            : parseInt(process.env.NUMBER_OF_PROCESSORS || "1");
        } catch {
          nprocs = parseInt(process.env.NUMBER_OF_PROCESSORS || "1");
        }
      } else {
        const result = execSync("getconf _NPROCESSORS_ONLN", {
          encoding: "utf-8",
        });
        nprocs = parseInt(result.trim());
      }

      let d2eCpuLimit = Math.floor(nprocs * this.D2E_RESOURCE_LIMIT);
      if (d2eCpuLimit === 0) d2eCpuLimit = 1;

      let envContent = fs.readFileSync(dotenvFile, "utf-8");
      envContent = envContent.replace(/^D2E_CPU_LIMIT=.*$/gm, "").trim();
      envContent += `\nD2E_CPU_LIMIT=${d2eCpuLimit}\n`;
      fs.writeFileSync(dotenvFile, envContent);
      console.log(`D2E_CPU_LIMIT=${d2eCpuLimit}`);
    } catch (error) {
      console.error("Error setting CPU limit:", error);
    }
  }

  setMemoryLimit(dotenvFile: string): void {
    console.log(". INFO set memory limit");

    try {
      let memoryGb: number;

      if (this.OS === "Darwin") {
        const result = execSync("sysctl -n hw.memsize", { encoding: "utf-8" });
        const memoryBytes = parseInt(result.trim());
        memoryGb = Math.floor(memoryBytes / (1024 * 1024 * 1024));
      } else if (this.OS === "Windows_NT") {
        try {
          const result = execSync(
            "wmic ComputerSystem get TotalPhysicalMemory /value",
            {
              encoding: "utf-8",
            }
          );
          const match = result.match(/TotalPhysicalMemory=(\d+)/);
          const memoryBytes = match ? parseInt(match[1]) : 0;
          memoryGb = Math.floor(memoryBytes / (1024 * 1024 * 1024));
        } catch {
          memoryGb = 0;
        }
      } else {
        const result = execSync("free -g | grep Mem: | awk '{print $2}'", {
          encoding: "utf-8",
        });
        memoryGb = parseInt(result.trim());
      }

      let d2eMemoryLimit = Math.floor(memoryGb * this.D2E_RESOURCE_LIMIT);
      let d2eSwapLimit = d2eMemoryLimit * this.D2E_MEM_TO_SWAP_LIMIT_RATIO;

      const d2eMemoryLimitStr = `${d2eMemoryLimit}G`;
      const d2eSwapLimitStr = `${d2eSwapLimit}G`;

      let envContent = fs.readFileSync(dotenvFile, "utf-8");
      envContent = envContent
        .replace(/^D2E_MEMORY_LIMIT=.*$/gm, "")
        .replace(/^D2E_SWAP_LIMIT=.*$/gm, "")
        .trim();
      envContent += `\nD2E_MEMORY_LIMIT=${d2eMemoryLimitStr}\n`;
      envContent += `D2E_SWAP_LIMIT=${d2eSwapLimitStr}\n`;
      fs.writeFileSync(dotenvFile, envContent);
      console.log(`D2E_MEMORY_LIMIT=${d2eMemoryLimitStr}`);
      console.log(`D2E_SWAP_LIMIT=${d2eSwapLimitStr}`);
    } catch (error) {
      console.error("Error setting memory limit:", error);
    }
  }

  genTlsInternal(dotenvFile: string): void {
    console.log(". INFO generate x509 certs - TLS__INTERNAL_*");

    try {
      const opensslVersion = execSync("openssl version", { encoding: "utf-8" });
      if (!opensslVersion.includes("OpenSSL 3")) {
        console.error("FATAL: openssl version 3 is required");
        return;
      }

      const caKeyFile = path.join(os.tmpdir(), `ca-key-${Date.now()}.pem`);
      const caConfFile = path.join(os.tmpdir(), `ca-conf-${Date.now()}.cnf`);
      const PKEY_ALGORITHM = "ec";
      const PKEY_OPT = "ec_paramgen_curve:P-256";

      // Create CA config file
      const caConfContent = `[ req ]
        distinguished_name = req_distinguished_name
        x509_extensions = v3_ext
        prompt = no

        [ req_distinguished_name ]
        CN = D2E Internal CA

        [ v3_ext ]
        keyUsage = critical,keyCertSign,cRLSign
        basicConstraints = critical,CA:TRUE,pathlen:1`;
      fs.writeFileSync(caConfFile, caConfContent);

      // Generate TLS__INTERNAL__CA_KEY CA key to ${caKeyFile}
      execSync(
        `openssl genpkey -algorithm ${PKEY_ALGORITHM} -pkeyopt ${PKEY_OPT} -out "${caKeyFile}"`,
        { encoding: "utf-8" }
      );

      // Generate TLS__INTERNAL__CA_CRT CA certificate to ${caCertFile}
      const caCertFile = path.join(os.tmpdir(), `ca-cert-${Date.now()}.pem`);
      execSync(
        `openssl req -x509 -key "${caKeyFile}" -sha256 -days 3650 -config "${caConfFile}" -out "${caCertFile}"`,
        { encoding: "utf-8" }
      );

      // Generate TLS__INTERNAL__KEY server key to ${serverKeyFile}
      const serverKeyFile = path.join(
        os.tmpdir(),
        `server-key-${Date.now()}.pem`
      );
      execSync(
        `openssl genpkey -algorithm ec -pkeyopt ${PKEY_OPT} -out "${serverKeyFile}"`,
        { encoding: "utf-8" }
      );

      // Create server CSR config file
      const serverConfFile = path.join(
        os.tmpdir(),
        `server-conf-${Date.now()}.cnf`
      );
      const serverConfContent = `[ req ]
        distinguished_name = req_distinguished_name
        req_extensions = v3_req
        prompt = no

        [ req_distinguished_name ]
        CN = ${this.TLS__INTERNAL__DOMAIN_NAME}

        [ v3_req ]
        subjectAltName = DNS:*.d2e.local
        keyUsage = critical,digitalSignature
        extendedKeyUsage = serverAuth,clientAuth`;
      fs.writeFileSync(serverConfFile, serverConfContent);

      // Generate server CSR
      const serverCsrFile = path.join(
        os.tmpdir(),
        `server-csr-${Date.now()}.pem`
      );
      execSync(
        `openssl req -new -sha256 -key "${serverKeyFile}" -config "${serverConfFile}" -out "${serverCsrFile}"`,
        { encoding: "utf-8" }
      );

      // Create extensions file for signing
      const extFile = path.join(os.tmpdir(), `ext-${Date.now()}.cnf`);
      const extContent = `subjectAltName = DNS:*.d2e.local
        keyUsage = critical,digitalSignature
        extendedKeyUsage = serverAuth,clientAuth`;
      fs.writeFileSync(extFile, extContent);

      // Generate TLS__INTERNAL__CRT server certificate to ${serverCertFile}
      const serverCertFile = path.join(
        os.tmpdir(),
        `server-cert-${Date.now()}.pem`
      );
      execSync(
        `openssl x509 -req -in "${serverCsrFile}" -CA "${caCertFile}" -CAkey "${caKeyFile}" -CAcreateserial -days 3650 -sha256 -extfile "${extFile}" -out "${serverCertFile}"`,
        { encoding: "utf-8" }
      );

      const TLS__INTERNAL__CA_KEY = fs.readFileSync(caKeyFile, "utf-8").trim();
      const TLS__INTERNAL__CA_CRT = fs.readFileSync(caCertFile, "utf-8").trim();
      const TLS__INTERNAL__KEY = fs.readFileSync(serverKeyFile, "utf-8").trim();
      const TLS__INTERNAL__CRT = fs
        .readFileSync(serverCertFile, "utf-8")
        .trim();

      let envContent = fs.readFileSync(dotenvFile, "utf-8");
      envContent = envContent
        .replace(/^TLS__INTERNAL__CA_CRT=[\s\S]*?END CERTIFICATE-----'$/gm, "")
        .replace(/^TLS__INTERNAL__CRT=[\s\S]*?END CERTIFICATE-----'$/gm, "")
        .replace(/^TLS__INTERNAL__KEY=[\s\S]*?PRIVATE KEY-----'$/gm, "")
        .replace(/^TLS__INTERNAL__CA_KEY=[\s\S]*?PRIVATE KEY-----'$/gm, "")
        .trim();

      envContent += `\nTLS__INTERNAL__CA_CRT="${TLS__INTERNAL__CA_CRT.replace(
        /\\/g,
        "\\\\"
      ).replace(/"/g, '\\"')}"\n`;
      envContent += `TLS__INTERNAL__CRT="${TLS__INTERNAL__CRT.replace(
        /\\/g,
        "\\\\"
      ).replace(/"/g, '\\"')}"\n`;
      envContent += `TLS__INTERNAL__KEY="${TLS__INTERNAL__KEY.replace(
        /\\/g,
        "\\\\"
      ).replace(/"/g, '\\"')}"\n`;
      fs.writeFileSync(dotenvFile, envContent);

      const tempFiles = [
        caKeyFile,
        caConfFile,
        caCertFile,
        serverKeyFile,
        serverConfFile,
        serverCsrFile,
        extFile,
        serverCertFile,
      ];
      tempFiles.forEach((file) => {
        try {
          fs.unlinkSync(file);
        } catch {
          // File may not exist
        }
      });

      console.log("TLS certificates generated successfully");
    } catch (error) {
      console.error("Error generating TLS certificates:", error);
    }
  }
}
