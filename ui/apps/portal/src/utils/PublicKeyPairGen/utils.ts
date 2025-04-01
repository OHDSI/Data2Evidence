export const ALGORITHM = {
  RSA_PSS: {
    name: "RSA-PSS",
    hash: "SHA-256",
  },
  RSA_OAEP: { name: "RSA-OAEP", hash: "SHA-256" },
  AES_GCM: { name: "AES-GCM" },
};
/**
 * Convert an UTF-8 string into encoded Uint8Array.
 *
 * **Note**: Use this function to convert all strings that are send to an API.
 * @param string The string that needs to be UTF-8 encoded into a Uint8Array
 * @returns The UTF-8 encoded Uint8Array of the input
 */
export const stringToUint8Array = (string: string): Uint8Array => new TextEncoder().encode(string);

/**
 * Convert a string into a base64 encoded ArrayBuffer
 * @param string The string that needs to be converted into an ArrayBuffer
 * @returns An ArrayBuffer
 */
export const base64StringToArrayBuffer = (string: string): ArrayBuffer => {
  const base64 = atob(string);
  const buffer = new ArrayBuffer(base64.length);
  const bufferView = new Uint8Array(buffer);
  for (let i = 0, base64Len = base64.length; i < base64Len; i++) {
    bufferView[i] = base64.charCodeAt(i);
  }
  return buffer;
};

/**
 * Convert an ArrayBuffer to a Base64 encoded string
 */
export const arrayBufferToBase64 = (arrayBuffer: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

/**
 * Fill a Uint8Array with random values
 */
export const fillWithRandomBytes = (array: Uint8Array): Uint8Array => crypto.getRandomValues(array);

/**
 * Get a random integer between _min_ and _max_
 * @param min Min number
 * @param max Max number
 */
export const getRandomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1) + min);
