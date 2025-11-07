// tslint:disable:max-classes-per-file
// tslint:disable-next-line:no-namespace
export namespace MockHdb {
  export class ColumnMetadata {
    constructor(
      public catalogName: string,
      public displaySize: number,
      public label: string,
      public name: string,
      public type: string,
      public typeName: string,
      public precision: number,
      public scale: number,
      public tableName: string,
      public isNullable: number
    ) {}
  }

  export class MetaData {
    private _connection: Connection;
    columns: ColumnMetadata[];
    constructor(connection: Connection) {
      this._connection = connection;

      let resultSet = this._connection.getBackdoorResultSet();
      let sampleRow = resultSet[0];
      this.columns = Object.keys(this._connection.getBackdoorResultSet()).map(
        (key) => {
          return new ColumnMetadata(
            "catalogName", //catalogName
            1, //displaySize
            key, //label
            key, //name
            "1", //type
            typeof sampleRow[key] === "number" ? "INTEGER" : "VARCHAR", //typeName
            1, //precision
            1, //scale
            "", //tableName
            1 //isNullable
          );
        }
      );
    }
  }

  export class ResultSetIterator {
    private _connection: Connection;
    private _position: number;
    constructor(connection: Connection) {
      this._connection = connection;
      this._position = -1;
    }
    next(): boolean {
      this._position += 1;
      return this._position < this._connection.getBackdoorResultSet().length;
    }
    value(): any {
      return this._connection.getBackdoorResultSet()[this._position];
    }
  }

  export class ResultSet {
    metadata: MetaData;
    private _connection: Connection;
    private _iterator: ResultSetIterator;

    constructor(connection: Connection) {
      this.metadata = new MetaData(connection);
      this._connection = connection;
      this._iterator = new ResultSetIterator(connection);
    }

    getIterator() {
      return this._iterator;
    }

    get length(): number {
      return this._connection.getBackdoorResultSet().length;
    }
  }
  /**
   * Fake XS DB connection object.
   */
  export class Connection {
    conn: any;
    schemaName: string;
    enable: boolean;
    private _fakeResult: any[];
    private _resultSet: ResultSet;
    callCtr: number;
    callParams: any[];

    constructor(result: any[]) {
      this.enable = true;
      this._fakeResult = result || [];
      this._resultSet = new ResultSet(this);
      this.callCtr = 0;
    }
    close() {}
    commit() {}
    execute() {}
    executeBulkUpdate() {}
    executeBulkInsert() {}
    executeProc() {}
    parseResults() {}
    executeQuery(query: string, ...params: any[]): ResultSet {
      this.callCtr += 1;
      this.callParams = params;
      return this._resultSet;
    }
    executeUpdate(statement: string, ...params: any[]): number {
      this.callCtr += 1;
      this.callParams = params;
      return this._fakeResult.length;
    }
    loadProcedure(schema: string, procedure: string) {
      return (...params: any[]) => {
        this.callCtr += 1;
        this.callParams = params;
        return { $resultSets: [this._resultSet] };
      };
    }
    rollback() {}
    setAutoCommit(enable: boolean) {
      this.enable = enable;
    }
    getBackdoorResultSet(): any[] {
      return this._fakeResult;
    }
    setCurrentUserToDbSession(user: string) {}
    setAutoCommitToFalse() {}
  }

  /**
   * $.hdb.getConnection()
   */
  export function getConnection(result: any[]): Connection {
    return new Connection(result);
  }
}
