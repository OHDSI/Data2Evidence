import { useCallback, useEffect, useState } from "react";
import { NodeProps, Position, useUpdateNodeInternals } from "reactflow";
import { debounce } from "lodash";
import { Button } from "@mui/material";
import { TableSchemaState, TableTargetHandleData, useCdmSchema, useTable } from "../contexts";
import { MappingHandle } from "./MappingHandle";
import { api } from "../axios/api";
import "./BaseNode.scss";

export const TableTargetNode = (props: NodeProps) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const { targetHandles, setTableTargetHandles } = useTable();
  const [cdmVersions, setCdmVersions] = useState<string[]>([]);
  const { setCdmVersion, setCdmTables } = useCdmSchema();

  const populateCDMVersion = useCallback((data: TableSchemaState[]) => {
    const targetHandles: Partial<NodeProps<TableTargetHandleData>>[] = data.map((table, index) => ({
      id: `C.${index + 1}`,
      data: { label: table.table_name, tableName: table.table_name },
      targetPosition: Position.Left,
    }));

    setTableTargetHandles(targetHandles);
    updateNodeInternals(props.id);
  }, []);

  const fetchCDMSchema = useCallback(
    async (cdmVersion: string) => {
      try {
        const response = await api.backend.getCDMSchema(cdmVersion);
        setCdmVersion(cdmVersion);
        setCdmTables(response);
        populateCDMVersion(response);
      } catch (e) {
        console.error(e);
      }
    },
    [populateCDMVersion]
  );

  const handleWheel = debounce(() => {
    updateNodeInternals(props.id);
  }, 100);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.backend.getCDMVersions();
      const cdmVersions = response.sort((a: string, b: string) => (a > b ? -1 : 1));
      setCdmVersions(cdmVersions);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div
      className="base-node table-node nodrag nowheel"
      onWheel={() => {
        handleWheel();
      }}
    >
      <div className="content-container">
        {targetHandles.length ? (
          <div className="handle-container scroll-shadow">
            {targetHandles.map((node) => (
              <MappingHandle {...node} key={node.id} />
            ))}
          </div>
        ) : (
          <div className="action-container">
            <div className="description">Please select CDM version to see target tables</div>
            <div className="button-group">
              {cdmVersions.slice(0, 2).map((cdmVersion) => {
                return (
                  <Button variant="contained" fullWidth onClick={() => fetchCDMSchema(cdmVersion)}>
                    Version {cdmVersion}
                  </Button>
                );
              })}

              <Button variant="contained" fullWidth>
                Select Other Version
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
