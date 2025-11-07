import React, { FC } from "react";
import { default as MatTableRow, TableRowProps } from "@mui/material/TableRow";

export const TableRow: FC<TableRowProps> = (props) => <MatTableRow {...props} data-testid="table-row" />;
