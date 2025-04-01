import { FC } from "react";
import { Chip } from "@mui/material";
import { MappingHandle } from "../Nodes";
import "./TableToTable.scss";

interface TableToTableProps {
  source: string;
  target: string;
}
export const TableToTable: FC<TableToTableProps> = ({ source, target }) => {
  return (
    <div className="table-to-table">
      <Chip variant="outlined" label="Table" id="table-chip" />
      <MappingHandle data={{ label: source, type: "input" }} />
      <svg height="40" width="80">
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#b1b1b7" />
          </marker>
        </defs>
        <line
          x1="0"
          y1="25"
          x2="75"
          y2="25"
          style={{ stroke: "#b1b1b7", strokeWidth: 2 }}
          markerEnd="url(#arrow)"
        />
      </svg>
      <MappingHandle data={{ label: target }} />
      <Chip variant="outlined" label="Fields" id="field-chip" />
    </div>
  );
};
