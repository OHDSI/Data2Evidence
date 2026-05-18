import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const mockGetText = vi.fn((key: string) => key);

vi.mock("../hooks", () => ({
  useTranslation: () => ({
    getText: mockGetText,
  }),
}));

vi.mock("@portal/components", () => ({
  Button: ({ text, onClick }: { text: string; onClick: () => void }) => (
    <button onClick={onClick}>{text}</button>
  ),
  EditIcon: () => <span>EditIcon</span>,
  IconButton: ({ startIcon, onClick }: { startIcon: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{startIcon}</button>
  ),
  VisibilityOnIcon: () => <span>VisibilityOnIcon</span>,
}));

vi.mock("material-react-table", () => ({
  useMaterialReactTable: (config: unknown) => ({
    ...(config as Record<string, unknown>),
    resetPagination: vi.fn(),
  }),
  MaterialReactTable: ({ table }: { table: any }) => (
    <div>
      {table.data.map((row: any) => (
        <div key={row.id} data-testid={`row-${row.id}`}>
          {table.columns
            .filter((column: any) => column.id === "actions")
            .map((column: any) => (
              <div key={column.id}>{column.Cell({ row: { original: row } })}</div>
            ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("./ConceptSets.scss", () => ({}));
vi.mock("@mui/icons-material/Delete", () => ({
  default: () => <span data-testid="DeleteIcon">DeleteIcon</span>,
}));

import { ConceptSetsTable } from "./ConceptSetsTable";

describe("ConceptSetsTable", () => {
  it("renders view-only actions for read-only legacy concept sets", () => {
    const onAddEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ConceptSetsTable
        data={[
          {
            id: 15,
            name: "Legacy set",
            concepts: [],
            shared: false,
            createdBy: "owner",
            userName: "owner",
            hasWriteAccess: false,
          },
        ]}
        isLoading={false}
        userName="owner"
        onAddEdit={onAddEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText("VisibilityOnIcon")).toBeTruthy();
    expect(screen.queryByText("EditIcon")).toBeNull();
    expect(screen.queryByTestId("DeleteIcon")).toBeNull();

    fireEvent.click(screen.getByText("VisibilityOnIcon"));
    expect(onAddEdit).toHaveBeenCalledWith(15);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("renders edit and delete actions for writable WebAPI concept sets", () => {
    const onAddEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ConceptSetsTable
        data={[
          {
            id: 1000000007,
            name: "Native set",
            concepts: [],
            shared: false,
            createdBy: "owner",
            userName: "owner",
            hasWriteAccess: true,
          },
        ]}
        isLoading={false}
        userName="owner"
        onAddEdit={onAddEdit}
        onDelete={onDelete}
      />
    );

    const row = screen.getByTestId("row-1000000007");
    const buttons = within(row).getAllByRole("button");
    expect(screen.getByText("EditIcon")).toBeTruthy();
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(onAddEdit).toHaveBeenCalledWith(1000000007);
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1000000007, hasWriteAccess: true })
    );
  });
});
