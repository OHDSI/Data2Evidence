import { Connection as conn } from "@alp/alp-base-utils";
import ConnectionInterface = conn.ConnectionInterface;
import CallBackInterface = conn.CallBackInterface;
import ParameterInterface = conn.ParameterInterface;

export class MockConnection implements ConnectionInterface {
  public conn: any;
  public schemaName: string;
  constructor() {}
  dialect: string;
  
  activate_nativedb_communication?(credentials: any): void {
    throw new Error("Method not implemented.");
  }
  deactivate_nativedb_communication?(dbName: any): void {
    throw new Error("Method not implemented.");
  }

  setCurrentUserToDbSession() {}

  public static createConnection() {
    return new MockConnection();
  }

  public execute(
    sql,
    parameters: ParameterInterface[],
    callback: CallBackInterface
  ) {
    throw new Error(
      "This class is mainly used for unit testing, hence implementation NOT provided!"
    );
  }

  public executeQuery(
    sql,
    parameters: ParameterInterface[],
    callback: CallBackInterface
  ) {
    throw new Error(
      "This class is mainly used for unit testing, hence implementation NOT provided!"
    );
  }

  public executeStreamQuery(
    sql,
    parameters: ParameterInterface[],
    callback: CallBackInterface
  ) {
    throw new Error(
      "This class is mainly used for unit testing, hence implementation NOT provided!"
    );
  }

  public executeUpdate(
    sql: string,
    parameters: ParameterInterface[],
    callback: CallBackInterface
  ) {
    throw new Error(
      "This class is mainly used for unit testing, hence implementation NOT provided!"
    );
  }

  public executeProc(
    procedure: string,
    parameters: any[],
    callback: CallBackInterface
  ) {
    throw new Error(
      "This class is mainly used for unit testing, hence implementation NOT provided!"
    );
  }

  public commit() {
    throw new Error(
      "This class is mainly used for unit testing, hence implementation NOT provided!"
    );
  }

  public rollback(callback: CallBackInterface) {
    throw new Error(
      "This class is mainly used for unit testing, hence implementation NOT provided!"
    );
  }

  public parseResults(result: any, metadata: any) {
    throw new Error(
      "This class is mainly used for unit testing, hence implementation NOT provided!"
    );
  }

  public close() {
    throw new Error(
      "This class is mainly used for unit testing, hence implementation NOT provided!"
    );
  }

  public executeBulkUpdate(
    sql: string,
    parameters: ParameterInterface[][],
    callback: CallBackInterface
  ) {
    throw new Error(
      "This class is mainly used for unit testing, hence implementation NOT provided!"
    );
  }

  public executeBulkInsert(
    sql: string,
    parameters: null[][],
    callback: CallBackInterface
  ) {
    throw "This class is mainly used for unit testing, hence implementation NOT provided!";
  }

  public setAutoCommitToFalse(callback?: CallBackInterface) {
    throw "This class is mainly used for unit testing, hence implementation NOT provided!";
  }

  public setTemporalSystemTimeToDbSession(
    systemTime: string,
    cb: CallBackInterface
  ) {
    throw "This class is mainly used for unit testing, hence implementation NOT provided!";
  }
}
