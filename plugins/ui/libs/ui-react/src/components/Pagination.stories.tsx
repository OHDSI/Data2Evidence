import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pagination } from "./Pagination";

const meta = {
  title: "Data display/Pagination",
  component: Pagination,
  args: {
    page: 1,
    pageSize: 10,
    totalCount: 123,
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  font: "600 16px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-primary)",
} as const;

function Demo({ total }: { total: number }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  return (
    <div style={{ width: 1288, maxWidth: "100%", border: "1px solid var(--d2e-color-neutral-lighter)", borderRadius: 8 }}>
      <Pagination
        page={page}
        pageSize={pageSize}
        totalCount={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}

export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Default</h3>
        <Demo total={123} />
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Empty</h3>
        <Demo total={0} />
      </section>
    </div>
  ),
};

export const Playground: Story = {
  args: {
    page: 1,
    pageSize: 10,
    totalCount: 123,
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
};
