import React, { FC } from "react";
import { default as MatTableCell, TableCellProps } from "@mui/material/TableCell";

export const TableCell: FC<TableCellProps> = (props) => <MatTableCell {...props} data-testid="table-cell" />;
