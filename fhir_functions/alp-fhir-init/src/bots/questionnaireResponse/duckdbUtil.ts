import { Connection, Database } from "duckdb-async";
export class DuckdbConnection{
    private connection: Connection;
    constructor(){}
    public async createConnection(){
        try{
            const duckdDB = await Database.create(
                `${process.env.DUCKDB_PATH}/cdmdefault.duckdb`
            );
            this.connection = await duckdDB.connect();
        }catch(err){
            console.log(err)
            throw err
        }
    }

    private async execute(sql, parameters?: []) {
        try {
            let temp = sql;
            const result = await this.connection.all(
                temp,
                parameters
            );
            return result
        } catch (err) {
            throw(err);
        }
    }

    public async executeQuery(sql, parameters?: []) {
        try {
            const resultset = await this.execute(sql, parameters)
            const result = this.parseResults(resultset);
            return result;
        } catch (err) {
            throw err;
        }
    }

    public parseResults(result: any) {
        function formatResult(value: any) {
            switch (typeof value) {
                case "bigint": //bigint
                    return Number(value) * 1;
                default:
                    return value;
            }
        }
        Object.keys(result).forEach((rowId) => {
            Object.keys(result[rowId]).forEach((colKey) => {
                if (
                    result[rowId][colKey] === null ||
                    typeof result[rowId][colKey] === "undefined"
                ) {
                    result[rowId][colKey] ='NoValues';
                } else {
                    result[rowId][colKey] = formatResult(result[rowId][colKey]);
                }
            });
        });
        return result;
    }

    public close(){
        this.connection.close();
    }
}