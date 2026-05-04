import { FC, useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import { Loader, TableCell, TableRow, Text } from "@portal/components";
import { api } from "../../axios/api";

interface SavedMappingsTableProps {
  databaseCode: string;
  schemaName: string;
}

type SavedMappingRow = {
  source_code: string;
  source_concept_id: number;
  source_vocabulary_id: string;
  source_code_description: string;
  target_concept_id: number;
  target_vocabulary_id: string;
  valid_start_date: string;
  valid_end_date: string;
  invalid_reason: string;
};

const COLUMNS: { key: keyof SavedMappingRow; label: string }[] = [
  { key: "source_code", label: "Source Code" },
  { key: "source_concept_id", label: "Source Concept ID" },
  { key: "source_vocabulary_id", label: "Source Vocabulary ID" },
  { key: "source_code_description", label: "Source Code Description" },
  { key: "target_concept_id", label: "Target Concept ID" },
  { key: "target_vocabulary_id", label: "Target Vocabulary ID" },
  { key: "valid_start_date", label: "Valid Start Date" },
  { key: "valid_end_date", label: "Valid End Date" },
  { key: "invalid_reason", label: "Invalid Reason" },
];

export const SavedMappingsTable: FC<SavedMappingsTableProps> = ({ databaseCode, schemaName }) => {
  const [data, setData] = useState<SavedMappingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.conceptMapping.getConceptMappings(databaseCode, schemaName);
        setData(result);
      } catch {
        setError("Failed to load saved mappings");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [databaseCode, schemaName]);

  if (loading) return <Loader />;
  if (error) return <div style={{ padding: "16px", color: "red" }}>{error}</div>;

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableCell key={col.key}>{col.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} align="center">
                No saved mappings found
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={index}>
                {COLUMNS.map((col) => (
                  <TableCell key={col.key}>
                    <Text textFormat="wrap">{String(row[col.key] ?? "-")}</Text>
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
