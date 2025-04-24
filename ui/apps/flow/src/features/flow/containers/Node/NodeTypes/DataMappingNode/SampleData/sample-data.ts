import Papa from "papaparse";

export const sampleCDM = {
  "5.3": "OMOP v5.3",
  "5.4": "OMOP v5.4",
};

export const sampleInput = [
  {
    id: 1,
    dbName: "Sample DB",
    tableName: "sample_table_1",
    fields: [
      { name: "sample_field_1", type: "String", desc: "This is sample field" },
      {
        name: "sample_field_2",
        type: "Integer",
        desc: "This is sample field 2",
      },
      {
        name: "sample_field_3",
        type: "Boolean",
        desc: "This is sample field 3",
      },
    ],
  },
  {
    id: 2,
    dbName: "Sample DB 2",
    tableName: "sample_table_2",
    fields: [
      { name: "sample_field_1", type: "String", desc: "This is sample field" },
      {
        name: "sample_field_2",
        type: "Integer",
        desc: "This is sample field 2",
      },
      {
        name: "sample_field_3",
        type: "Boolean",
        desc: "This is sample field 3",
      },
    ],
  },
];

async function getData(path: string) {
  const response = await fetch(path);
  const reader = response.body.getReader();
  const result = await reader.read();
  const decoder = new TextDecoder("utf-8");
  const csv = decoder.decode(result.value);
  const results = Papa.parse(csv, { header: true });
  const rows = results.data;
  return rows;
}

export async function getCDMData(cdmVersion: string) {
  const tables = await getData(`./OMOP_CDMv${cdmVersion}_Table_Level.csv`);
  const fields = await getData(`./OMOP_CDMv${cdmVersion}_Field_Level.csv`);
  return { tables, fields };
}
