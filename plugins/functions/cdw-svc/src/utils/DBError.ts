export class DBError extends Error {

    public errorKey = "MRI_DB_LOGGED_MESSAGE";

    constructor(public logId: string, public message: string) {
        super(message);
        this.name = "MRIDBError";
    }
}
