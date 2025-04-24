export class DbType {
  static MYSQL = new DbType("mysql");
  static MSSQL = new DbType("mssql");
  static PDW = new DbType("pdw");
  static ORACLE = new DbType("oracle");
  static POSTGRESQL = new DbType("postgresql");
  static MSACCESS = new DbType("msaccess");
  static REDSHIFT = new DbType("redshift");
  static TERADATA = new DbType("teradata");
  static BIGQUERY = new DbType("bigquery");
  static AZURE = new DbType("azure");
  static DATABRICKS = new DbType("databricks");

  private constructor(private readonly type: string) {}

  equals(other: DbType): boolean {
    return other instanceof DbType && other.type === this.type;
  }

  getTypeName(): string {
    return this.type;
  }
}
