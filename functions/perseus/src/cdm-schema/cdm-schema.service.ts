import { Service } from "typedi";
import * as path from "path";
import { parse } from "jsr:@std/csv";
import { CDM_VERSION_LIST } from "../utils/constants.ts";
import { TableSchema, ColumnInfo } from "../types.ts";

@Service()
export class CDMSchemaService {
  private readonly logger = console;
  constructor() {}

  getExistVersions() {
    this.logger.info("Get existing cdm versions");
    return CDM_VERSION_LIST;
  }

  async getSchema(cdmVersion: string) {
    this.logger.info("get schema");
    return await this.getSchemaFromCsv(cdmVersion);
  }

  private async getSchemaFromCsv(cdmVersion: string): Promise<TableSchema[]> {
    const functionRoot = Deno.env.get("TREX_FUNCTION_PATH") ?? "";
    const currentDir = path.dirname(path.fromFileUrl(import.meta.url));
    const schemaBaseDir = path.dirname(currentDir);

    const TREX_PREFIX = "/var/tmp/sb-compile-trex";
    let baseDir = schemaBaseDir;

    if (functionRoot && baseDir.startsWith(TREX_PREFIX)) {
      const functionName = path.basename(functionRoot);
      const afterPrefix = baseDir.slice(TREX_PREFIX.length);
      const prefix = `/${functionName}`;
      const rest = afterPrefix.startsWith(prefix)
        ? afterPrefix.slice(prefix.length)
        : afterPrefix;
      baseDir = path.join(functionRoot, rest);
    }

    const p = path.join(baseDir, `model/sources/CDM/CDMv${cdmVersion}.csv`);
    try {
      const fileContent = await Deno.readTextFile(p);

      const records = parse(fileContent, { skipFirstRow: true }) as Array<{
        TABLE_NAME: string;
        COLUMN_NAME: string;
        DATA_TYPE: string;
        IS_NULLABLE: string;
      }>;

      const tableMap = records.reduce(
        (acc: Record<string, ColumnInfo[]>, record) => {
          const columnInfo: ColumnInfo = {
            column_name: record.COLUMN_NAME,
            column_type: record.DATA_TYPE,
            is_column_nullable: record.IS_NULLABLE,
          };

          acc[record.TABLE_NAME] ??= [];
          acc[record.TABLE_NAME].push(columnInfo);

          return acc;
        },
        {}
      );

      return Object.entries(tableMap).map(
        ([tableName, columns]): TableSchema => ({
          table_name: tableName,
          column_list: columns,
        })
      );
    } catch (error) {
      this.logger.error(
        `Error reading CDM schema file v${cdmVersion}: ${error.message}`
      );
      throw new Error(
        `Failed to load CDM schema version ${cdmVersion}: ${error.message}`
      );
    }
  }
}
