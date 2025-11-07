export enum KEY_TYPES {
  PRIVATE = "PRIVATE",
  PUBLIC = "PUBLIC",
}

export enum USAGE {
  ENCRYPT = "encrypt",
  DECRYPT = "decrypt",
  SIGN = "sign",
  VERIFY = "verify",
}

export type KeyPair = {
  private: string;
  public: string;
};

export enum ERROR_MESSAGES {
  COULD_NOT_IMPORT_KEYS = "Failed to import private-public key pair",
  COULD_NOT_GENERATE_KEYS = "Failed to generate private-public key pair",
  COULD_NOT_EXPORT_KEY = "Failed to export private-public key pair",
  COULD_NOT_IMPORT_KEY = "Failed to import private-public key pair",
}
