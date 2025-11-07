export interface TrexDB {
    "id": string;
    "host": string;
    "port": number;
    "name": string;
    "dialect": string;
    "credentials": object[];
    "vocab_schemas": string[];
    "publications": object[];
    "db_extra": object;
    "authentication_mode": string;
}