import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { TableRow } from "../TableRow";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";

it("renders correctly", () => {
  const { queryByTestId } = render(
    <Table>
      <TableHead>
        <TableRow />
      </TableHead>
    </Table>
  );
  expect(queryByTestId("table-row")).toBeTruthy();
});
