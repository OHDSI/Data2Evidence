import { Edge } from "reactflow";
import { FieldTargetHandleData, FieldTargetState, ScannedSchemaState, TableSchemaState } from "../contexts";

interface Ref {
  "@ref": number | undefined;
}

interface Field {
  "@id": number;
  "@type": string;
  table: Ref;
  name: string;
  tableName: string; // Temporary stored for lookup purpose
  comment: string;
  logic: string; // Temporary stored for display in the item-to-item-map
  valueCounts: {
    "@id"?: number;
    valueCounts: Array<{ "@type": string; value: string; frequency: number; this$0: { "@ref": number } }>;
    totalFrequency: number;
    mostFrequentValue: string | null;
    mostFrequentValueCount: number;
  };
  isNullable: boolean;
  type: string;
  description: string;
  maxLength: number;
  isStem: boolean;
  conceptIdHints: null | any;
  fractionEmpty: number;
  uniqueCount: number;
  fractionUnique: number;
}

interface Table {
  "@id": number;
  "@type": string;
  db: Ref;
  name: string;
  description: string;
  rowCount: number;
  rowsCheckedCount: number;
  comment: string;
  fields: {
    "@type": string;
    "@items": Field[];
  };
  isStem: boolean;
}

interface Db {
  "@id": number;
  dbName: string;
  conceptIdHintsVocabularyVersion: number | null;
  tables: {
    "@type": string;
    "@items": Table[];
  };
}

interface ItemToItemMap {
  "@type": string;
  sourceItem: Ref;
  cdmItem: Ref;
  extraFieldToValue: {
    "@type": string;
  };
  comment: string;
  logic: string;
  isCompleted: boolean;
}

export interface EtlModel {
  "@type": string;
  sourceDb: Db;
  cdmDb: Db;
  tableToTableMaps: {
    "@type": string;
    "@items": ItemToItemMap[];
  };
  tableMapToFieldToFieldMaps: {
    "@type": string;
    "@keys": ItemToItemMap[];
    "@items": {
      "@type": string;
      "@items": ItemToItemMap[];
    }[];
  };
}

const getFieldName = (fieldName: string) => fieldName.toLowerCase().replace(/\s+/g, "_");

const createField = (fieldId: number, fieldName: string, tableName: string, type: string): Omit<Field, "table"> => ({
  "@id": fieldId,
  "@type": "org.ohdsi.rabbitInAHat.dataModel.Field",
  name: getFieldName(fieldName),
  tableName,
  comment: "",
  logic: "",
  valueCounts: {
    valueCounts: [],
    totalFrequency: 0,
    mostFrequentValue: null,
    mostFrequentValueCount: -1,
  },
  isNullable: true,
  type,
  description: "",
  maxLength: 0,
  isStem: false,
  conceptIdHints: null,
  fractionEmpty: 0.1,
  uniqueCount: 10,
  fractionUnique: 1.0,
});

const createTable = (tableId: number, tableName: string): Omit<Table, "fields" | "db"> => ({
  "@id": tableId,
  "@type": "org.ohdsi.rabbitInAHat.dataModel.Table",
  name: tableName,
  description: "",
  rowCount: 0,
  rowsCheckedCount: 0,
  comment: "",
  isStem: false,
});

const createDb = (dbId: number, dbName: string): Omit<Db, "tables"> => ({
  "@id": dbId,
  dbName,
  conceptIdHintsVocabularyVersion: null,
});

const createMap = (sourceId: number | undefined, targetId: number | undefined): ItemToItemMap => ({
  "@type": "org.ohdsi.rabbitInAHat.dataModel.ItemToItemMap",
  sourceItem: {
    "@ref": sourceId,
  },
  cdmItem: {
    "@ref": targetId,
  },
  extraFieldToValue: {
    "@type": "java.util.HashMap",
  },
  comment: "",
  logic: "",
  isCompleted: false,
});

const getFieldByHandleId = (
  lookupTables: Table[],
  tableId: number | undefined,
  handleId: string | null | undefined
) => {
  if (!tableId) return undefined;

  const sourceParts = handleId?.split("-");
  const fieldName = sourceParts && sourceParts.length >= 2 ? sourceParts[1] : "";

  const table = lookupTables.find((t) => t["@id"] === tableId);
  const field = table?.fields["@items"]?.find((f) => getFieldName(f.name) === getFieldName(fieldName));

  return field;
};

const getLogicString = (fieldData?: FieldTargetHandleData) => {
  if (!fieldData) return "";

  if (fieldData.constantValue) {
    return `Constant value: "${fieldData.constantValue}"`;
  }
  if (fieldData.isSqlEnabled && fieldData.sql) {
    return `SQL Function: ${fieldData.sql}`;
  }
  if (fieldData.isLookupEnabled && fieldData.lookupSql) {
    return `Lookup: ${fieldData.lookupName} ${fieldData.lookupSql}`;
  }
  return "";
};

let etlGlobalVar = {
  tableId: 10,
  fieldId: 100,
};

export const transformEtlModel = (
  sourceDbId: number,
  sourceDbName: string,
  sourceSchema: ScannedSchemaState | undefined,
  targetDbId: number,
  targetDbName: string,
  cdmTables: TableSchemaState[],
  tableToTableMaps: Edge[],
  fieldToFieldMaps: Edge[],
  allTargetFields: {
    [tableName: string]: FieldTargetState[];
  }
): EtlModel => {
  const mappedSourceTables =
    sourceSchema?.source_tables.map((table) => {
      etlGlobalVar.tableId++;
      return {
        ...createTable(etlGlobalVar.tableId, table.table_name),
        db: {
          "@ref": sourceDbId,
        },
        fields: {
          "@type": "java.util.ArrayList",
          "@items": table.column_list.map((column) => {
            etlGlobalVar.fieldId++;
            return {
              ...createField(etlGlobalVar.fieldId, column.column_name, table.table_name, column.column_type),
              table: {
                "@ref": etlGlobalVar.tableId,
              },
            } as Field;
          }),
        },
      } as Table;
    }) || [];

  const mappedTargetTables = cdmTables.map((table) => {
    etlGlobalVar.tableId++;
    return {
      ...createTable(etlGlobalVar.tableId, table.table_name),
      db: {
        "@ref": targetDbId,
      },
      fields: {
        "@type": "java.util.ArrayList",
        "@items": table.column_list.map((column) => {
          etlGlobalVar.fieldId++;

          const targetField = allTargetFields[table.table_name].find((f) => f.data.label === column.column_name);

          return {
            ...createField(etlGlobalVar.fieldId, column.column_name, table.table_name, column.column_type),
            table: {
              "@ref": etlGlobalVar.tableId,
            },
            comment: targetField?.data?.comment || "",

            // Note: Logic is only applicable for linked fields
            // logic: getLogicString(targetField?.data),
          };
        }),
      },
    } as Table;
  });

  const mappedTableToTableMaps = tableToTableMaps.map((item) =>
    createMap(
      mappedSourceTables.find((t) => getFieldName(t.name) === getFieldName(item.sourceHandle || ""))?.["@id"],
      mappedTargetTables.find((t) => getFieldName(t.name) === getFieldName(item.targetHandle || ""))?.["@id"]
    )
  );

  const mappedFieldToFieldMaps = mappedTableToTableMaps.map((table) => {
    return {
      "@type": "java.util.ArrayList",
      "@items": fieldToFieldMaps
        .filter((item) => {
          const mappedSourceField = getFieldByHandleId(mappedSourceTables, table.sourceItem["@ref"], item.sourceHandle);
          if (!mappedSourceField) return false;

          const mappedTargetField = getFieldByHandleId(mappedTargetTables, table.cdmItem["@ref"], item.targetHandle);
          if (!mappedTargetField) return false;

          return true;
        })
        .map((item) => {
          const mappedSourceField = getFieldByHandleId(mappedSourceTables, table.sourceItem["@ref"], item.sourceHandle);
          const mappedTargetField = getFieldByHandleId(mappedTargetTables, table.cdmItem["@ref"], item.targetHandle);

          const targetField = allTargetFields[mappedTargetField?.tableName || ""].find(
            (f) => f.data.label === mappedTargetField?.name
          );

          return {
            ...createMap(mappedSourceField?.["@id"], mappedTargetField?.["@id"]),
            comment: mappedTargetField?.comment ? "" : targetField?.data?.comment || "",
            logic: getLogicString(targetField?.data),
          };
        }),
    };
  });

  return {
    "@type": "org.ohdsi.rabbitInAHat.dataModel.ETL",
    sourceDb: {
      ...createDb(sourceDbId, sourceDbName),
      tables: {
        "@type": "java.util.ArrayList",
        "@items": mappedSourceTables.filter((s) =>
          mappedTableToTableMaps.some((m) => m.sourceItem["@ref"] === s["@id"])
        ),
      },
    },
    cdmDb: {
      ...createDb(targetDbId, targetDbName),
      tables: {
        "@type": "java.util.ArrayList",
        "@items": mappedTargetTables.filter((s) => mappedTableToTableMaps.some((m) => m.cdmItem["@ref"] === s["@id"])),
      },
    },
    tableToTableMaps: {
      "@type": "java.util.ArrayList",
      "@items": mappedTableToTableMaps,
    },
    tableMapToFieldToFieldMaps: {
      "@type": "java.util.HashMap",
      "@keys": mappedTableToTableMaps,
      "@items": mappedFieldToFieldMaps,
    },
  };
};
