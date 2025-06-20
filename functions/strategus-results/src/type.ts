export enum USER_SCOPE {
  ADMIN = "Admin",
  READ = "Read",
}

export interface IDatabaseCredentialCredentialsItem {
  username: string;
  userScope: string;
  serviceScope: string;
  password: string;
}

export interface IDatabaseCredential {
  code: string;
  id: string;
  host: number;
  port: string;
  name: string;
  dialect: string;
  credentials: IDatabaseCredentialCredentialsItem[];
  vocab_schemas: string[];
  publications: string[];
  db_extra: any;
  cation_: string;
}

export interface IReadCredential {
  name: string;
  host: string;
  port: string;
  readUser: string;
  readPassword: string;
}
