import { fillWithRandomBytes, ALGORITHM } from "./utils";
import { USAGE } from "./types";

export const AES_BLOCKSIZE = 16;
export const KEY_LENGTH = 32;
export const HYBRID_ENCRYPTION_VERSION_AES_WITH_GCM = 2;

/**
 * Encrypt a message with hybrid encryption
 * @param message The message to encrypt
 * @param publicKey The public key used for encryption
 */
export const encrypt = async (plaintext: ArrayBuffer, publicKey: CryptoKey): Promise<ArrayBuffer> => {
  // Get version
  const version = HYBRID_ENCRYPTION_VERSION_AES_WITH_GCM;

  // Generate random symmetric key
  const keyBuffer = new ArrayBuffer(KEY_LENGTH);
  const key = new Uint8Array(keyBuffer);
  fillWithRandomBytes(key);

  // Create CryptoKey out of randomly generated key
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    {
      ...ALGORITHM.AES_GCM,
      length: 256,
    },
    false,
    [USAGE.ENCRYPT]
  );

  // Encrypt symmetric key with the public key
  const encryptedKey = await encryptWithAlg(key, publicKey, ALGORITHM.RSA_OAEP);

  // Generate initialization vector
  const iv = new Uint8Array(AES_BLOCKSIZE);
  fillWithRandomBytes(iv);

  // Encrypt plaintext with AES-CBC
  const ciphertext = await encryptWithAlg(plaintext, cryptoKey, {
    ...ALGORITHM.AES_GCM,
    iv,
  });

  // Write buffer
  const bufferLength = 1 + 2 + encryptedKey.byteLength + 8 + 16 + ciphertext.byteLength;
  const buffer = new ArrayBuffer(bufferLength);
  let dataView = new DataView(buffer);
  let offset = 0;

  // Write version (length 1)
  dataView.setUint8(0, version);
  offset++;

  // Write encrypted symmetric key length (length 2)
  dataView.setUint16(1, encryptedKey.byteLength, true);
  offset += 2;

  // Write encrypted symmetric key
  [dataView, offset] = setUint8Array(dataView, offset, new Uint8Array(encryptedKey));

  // Write initialization vector (length 16)
  [dataView, offset] = setUint8Array(dataView, offset, iv);

  // Write ciphertext length (length 8)
  // The format requires a Uint64, which is not supported by Javascript, therefore we
  // are writing the information as 2 Uint32 entries. And since it should be written in accordance
  // with little endian, we are writing a 32bit-length first and a 32-bit 0 after
  dataView.setUint32(offset, ciphertext.byteLength, true);
  dataView.setUint32(offset + 4, 0, true);
  offset += 8;

  // Write ciphertext
  [dataView, offset] = setUint8Array(dataView, offset, new Uint8Array(ciphertext));

  // Return buffer
  return buffer;
};

/**
 * Decrypt a hybrid encrypted message
 * @param buffer The message to decrypt as an ArrayBuffer
 * @param privateKey The private key used for decryption
 */
export const decrypt = async (buffer: ArrayBuffer, privateKey: CryptoKey): Promise<ArrayBuffer> => {
  // Create DataView for buffer
  const dataView = new DataView(buffer);
  // Initialize offset
  let offset = 0;

  // Extract version
  const version = dataView.getUint8(offset);
  if (version !== HYBRID_ENCRYPTION_VERSION_AES_WITH_GCM) {
    throw new Error(`Version mismatch: Only version ${HYBRID_ENCRYPTION_VERSION_AES_WITH_GCM} is supported`);
  }
  offset++;

  // Extract the length of the encrypted symmetric key
  const encryptedKeyLength = dataView.getUint16(offset, true);
  offset += 2;

  // Extract the encrypted symmetric key
  const encryptedKeyArray = new Uint8Array(buffer.slice(offset, encryptedKeyLength + offset));
  offset += encryptedKeyLength;

  // Extract the initialization vector
  const iv = new Uint8Array(buffer.slice(offset, 16 + offset));
  offset += 16;

  // Extract the length of the ciphertext
  const ciphertextLength = dataView.getUint8(offset);
  offset += 8;

  // Extract the ciphertext
  const ciphertext = new Uint8Array(buffer.slice(offset, ciphertextLength + offset));
  offset += ciphertextLength;

  // Decrypt the encrypted symmetric key
  const key = await decryptWithAlg(encryptedKeyArray, privateKey, ALGORITHM.RSA_OAEP);

  // Create a CryptoKey out of the symmetric key
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    {
      ...ALGORITHM.AES_GCM,
      length: 256,
    },
    false,
    [USAGE.DECRYPT]
  );

  // Decrypt the plaintext
  const plaintext = await decryptWithAlg(ciphertext, cryptoKey, {
    ...ALGORITHM.AES_GCM,
    iv,
  });

  // Return the plaintext as an ArrayBuffer
  return plaintext;
};

/**
 * Encrypt a message with a given algorithm and key
 */
const encryptWithAlg = (
  message: Uint8Array | ArrayBuffer,
  key: CryptoKey,
  algorithm: { name: string; iv?: Uint8Array; length?: number }
): PromiseLike<ArrayBuffer> => crypto.subtle.encrypt(algorithm, key, message);

/**
 * Decrypt a ciphertext with a given algorithm and key
 */
const decryptWithAlg = (
  ciphertext: Uint8Array,
  key: CryptoKey,
  algorithm: { name: string; iv?: Uint8Array; length?: number }
): PromiseLike<ArrayBuffer> => crypto.subtle.decrypt(algorithm, key, ciphertext);

/**
 * Add values to a DataView at a certain position
 * @param dataView The data view to which the values should be added
 * @param offset The offset where the values should be added
 * @param values The values that should be added
 */
const setUint8Array = (dataView: DataView, offset: number, values: Uint8Array): [DataView, number] => {
  for (const value of values) {
    dataView.setUint8(offset, value);
    offset++;
  }
  return [dataView, offset];
};
