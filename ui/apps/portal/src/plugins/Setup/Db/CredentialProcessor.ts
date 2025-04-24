import randomBytes from "randombytes";
import env from "../../../env";
import { IDbCredential, ServiceScopeType } from "../../../types";

export class DbCredentialProcessor {
  private readonly credentialsPublicKeys: { [type: string]: string };
  private readonly algo: RsaOaepParams = { name: "RSA-OAEP" };
  constructor() {
    try {
      this.credentialsPublicKeys = JSON.parse(env.REACT_APP_DB_CREDENTIALS_PUBLIC_KEYS);
      console.debug(`Loaded credentials public keys: ${JSON.stringify(this.credentialsPublicKeys)}`);
    } catch (err) {
      console.error("Error while loading credentials public keys", err);
      throw new Error("Error while configuring for credential encryption");
    }
  }

  async encryptDbCredential(cred: IDbCredential): Promise<IDbCredential> {
    const salt = this.createSalt();
    const { password, serviceScope } = cred;

    try {
      const encrypted = await this.encrypt(password, serviceScope, salt);

      return {
        ...cred,
        salt,
        password: encrypted,
      };
    } catch (error) {
      const errorMsg = "Error encrypting DB credentials";
      console.error(errorMsg, error);
      throw new Error(errorMsg);
    }
  }

  private createSalt() {
    return randomBytes(16).toString("base64");
  }

  private async encrypt(data: string, keyType: ServiceScopeType, salt: string) {
    const pub = this.credentialsPublicKeys[keyType];
    if (!pub) {
      const errorMessage = `No public key defined for ${keyType} for credential encryption`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const publicKey = await crypto.subtle.importKey(
        "spki",
        this.convertPEMtoBinary(pub),
        { ...this.algo, hash: "SHA-256" },
        true,
        ["encrypt"]
      );

      const dataText = this.setupData(data, salt);
      const enc = new TextEncoder();
      const encoded = enc.encode(dataText);
      const buffer = await window.crypto.subtle.encrypt(this.algo, publicKey, encoded);
      return this.convertBufferToBase64(buffer);
    } catch (error) {
      const errorMsg = "Error while encrypting data";
      console.error(errorMsg, error);
      throw new Error(errorMsg);
    }
  }

  private convertBufferToBase64(buffer: ArrayBuffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private setupData(data: string | object, salt: string) {
    if (typeof data === "object") {
      return JSON.stringify(data);
    }
    return this.addSalt(data, salt);
  }

  private addSalt(value: string, salt: string) {
    const max = value.length;
    const min = 0;
    const index = Math.floor(Math.random() * (max - min + 1) + min);
    return value.slice(0, index) + salt + value.slice(index);
  }

  private convertPEMtoBinary(pem: string): ArrayBuffer {
    const pemContents = pem
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\n/g, "");

    return this.base64ToArrayBuffer(pemContents);
  }

  private base64ToArrayBuffer(b64: string) {
    const byteString = window.atob(b64);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    return byteArray;
  }
}
