import { arrayBufferToBase64, base64StringToArrayBuffer, ALGORITHM } from "./utils";
import { KeyPair, KEY_TYPES, USAGE, ERROR_MESSAGES } from "./types";

/**
 * Generate an asymmetric key pair as a base64 encoded string. Optionally in PEM
 */
export const generateAsymKeyPair = async (asPem = false): Promise<KeyPair> => {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        ...ALGORITHM.RSA_OAEP,
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
      },
      true,
      [USAGE.ENCRYPT, USAGE.DECRYPT]
    );

    const exportedPublic = await exportKeyAsString(keyPair.publicKey, KEY_TYPES.PUBLIC, asPem);
    const exportedPrivate = await exportKeyAsString(keyPair.privateKey, KEY_TYPES.PRIVATE, asPem);
    return {
      private: exportedPrivate,
      public: exportedPublic,
    } as KeyPair;
  } catch (e) {
    console.error(e);
    throw new Error(ERROR_MESSAGES.COULD_NOT_GENERATE_KEYS);
  }
};

/**
 * Export a CryptoKey as a base64 encoded string. Optionally in PEM format
 * @param key The CryptoKey that should be exported
 * @param type The type of key (PUBLIC or PRIVATE)
 * @param asPEM Flag indicating if the key should be exported in PEM format or not. Defaults to _false_
 */
export const exportKeyAsString = async (key: CryptoKey, type: KEY_TYPES, asPEM = false): Promise<string> => {
  try {
    let arrayBuffer: ArrayBuffer;
    switch (type) {
      case KEY_TYPES.PRIVATE:
        arrayBuffer = await crypto.subtle.exportKey("pkcs8", key);
        break;
      case KEY_TYPES.PUBLIC:
        arrayBuffer = await crypto.subtle.exportKey("spki", key);
        break;
      default:
        throw new Error("Unknown KEYTYPE");
    }
    return asPEM ? convertBinaryToPEM(arrayBuffer, type) : arrayBufferToBase64(arrayBuffer);
  } catch (e) {
    console.error(e);
    throw new Error(ERROR_MESSAGES.COULD_NOT_EXPORT_KEY);
  }
};

/**
 * Import a base64 encoded key. The key can be in PEM format or only the base64 encoded string.
 * @param key The string containing the key (either in PEM or only the base64 encoded string)
 * @param type The type of key (PUBLIC or PRIVATE)
 * @param usage The Array indicating what can be done with the key
 * @param algorithm The dictionary object defining the type of key to import and providing extra algorithm-specific parameters
 * @param isPEM Flag indicating if the key is in PEM format or not. Defaults to _false_
 */
export const importKeyFromString = async (
  key: string,
  type: KEY_TYPES,
  usage: KeyUsage[],
  algorithm: { name: string; hash: string },
  isPEM = false
): Promise<CryptoKey> => {
  const keyArrayBuffer = isPEM ? convertPEMtoBinary(key) : base64StringToArrayBuffer(key);
  try {
    switch (type) {
      case KEY_TYPES.PRIVATE:
        return await crypto.subtle.importKey("pkcs8", keyArrayBuffer, algorithm, false, usage);
      case KEY_TYPES.PUBLIC:
        return await crypto.subtle.importKey("spki", keyArrayBuffer, algorithm, true, usage);
      default:
        throw new Error("Unknown KEYTYPE");
    }
  } catch (e) {
    console.error(e);
    throw new Error(ERROR_MESSAGES.COULD_NOT_IMPORT_KEY);
  }
};

/**
 * Convert a PEM formated key to an ArrayBuffer ready for importing
 * @param pem The base64 encoded key in PEM format
 */
const convertPEMtoBinary = (pem: string): ArrayBuffer => {
  const pemContents = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  // Convert from a binary string to an ArrayBuffer
  return base64StringToArrayBuffer(pemContents);
};

/**
 * Convert a key (ArrayBuffer) into base64 encoded key in PEM format
 * @param binary The ArrayBuffer to turn into PEM
 * @param type The type of the key
 */
const convertBinaryToPEM = (binary: ArrayBuffer, type: KEY_TYPES): string =>
  // The formatting is important! Please leave as is to create valid PEM
  `-----BEGIN ${type} KEY-----\n${arrayBufferToBase64(binary).replace(/(.{64})/g, "$1\n")}\n-----END ${type} KEY-----`;
