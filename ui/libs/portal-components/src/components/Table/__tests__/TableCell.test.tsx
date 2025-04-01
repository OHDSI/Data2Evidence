import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { TableRow } from "../TableRow";
import { TableCell } from "../TableCell";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";

it("renders correctly", () => {
  const { queryByTestId } = render(
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Content</TableCell>
        </TableRow>
      </TableHead>
    </Table>
  );
  expect(queryByTestId("table-cell")).toBeTruthy();
  expect(queryByTestId("table-cell")).toHaveTextContent("Content");
});
