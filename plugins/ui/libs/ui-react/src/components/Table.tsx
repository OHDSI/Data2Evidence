import { forwardRef } from "react";
import MuiTable, { type TableProps as MuiTableProps } from "@mui/material/Table";
import MuiTableHead, { type TableHeadProps as MuiTableHeadProps } from "@mui/material/TableHead";
import MuiTableBody, { type TableBodyProps as MuiTableBodyProps } from "@mui/material/TableBody";
import MuiTableRow, { type TableRowProps as MuiTableRowProps } from "@mui/material/TableRow";
import MuiTableCell, { type TableCellProps as MuiTableCellProps } from "@mui/material/TableCell";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { ReactNode } from "react";
import clsx from "clsx";
import { IconButton } from "./IconButton";
import "./Table.scss";

export const Table = forwardRef<HTMLTableElement, MuiTableProps>(function Table(
  { className, ...rest },
  ref,
) {
  return <MuiTable ref={ref} className={clsx("d2e-table", className)} {...rest} />;
});

export const TableHead = forwardRef<HTMLTableSectionElement, MuiTableHeadProps>(
  function TableHead({ className, ...rest }, ref) {
    return (
      <MuiTableHead ref={ref} className={clsx("d2e-table__head", className)} {...rest} />
    );
  },
);

export const TableBody = forwardRef<HTMLTableSectionElement, MuiTableBodyProps>(
  function TableBody({ className, ...rest }, ref) {
    return (
      <MuiTableBody ref={ref} className={clsx("d2e-table__body", className)} {...rest} />
    );
  },
);

export interface TableRowProps extends MuiTableRowProps {
  /** Left accent bar (Figma: selected rows with a checkbox get a #999FCB rule). */
  accent?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  function TableRow({ accent = false, className, ...rest }, ref) {
    return (
      <MuiTableRow
        ref={ref}
        className={clsx("d2e-table__row", accent && "d2e-table__row--accent", className)}
        {...rest}
      />
    );
  },
);

export interface TableCellProps extends Omit<MuiTableCellProps, "variant"> {
  /** Renders a <th> with header (Medium 14) typography. */
  header?: boolean;
  /** Right-aligns the content (number columns). */
  numeric?: boolean;
  /** Narrow 48px centred cell for a checkbox / expand control. */
  checkbox?: boolean;
  /** Renders a clickable sort control with the neutral ⇅ / active arrow. */
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | false;
  onSort?: () => void;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  function TableCell(
    {
      header = false,
      numeric = false,
      checkbox = false,
      sortable = false,
      sortDirection = false,
      onSort,
      align,
      padding,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const sortIcon =
      sortDirection === "asc" ? (
        <ArrowUpwardIcon />
      ) : sortDirection === "desc" ? (
        <ArrowDownwardIcon />
      ) : (
        <SwapVertIcon />
      );

    return (
      <MuiTableCell
        ref={ref}
        variant={header ? "head" : "body"}
        align={numeric ? "right" : align}
        padding={checkbox ? "checkbox" : padding}
        sortDirection={sortDirection}
        className={clsx(
          "d2e-table__cell",
          header && "d2e-table__cell--head",
          numeric && "d2e-table__cell--numeric",
          checkbox && "d2e-table__cell--checkbox",
          className,
        )}
        {...rest}
      >
        {sortable ? (
          <span
            className="d2e-table__sort"
            role="button"
            tabIndex={0}
            onClick={onSort}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSort?.();
              }
            }}
          >
            {children}
            {sortIcon}
          </span>
        ) : (
          children
        )}
      </MuiTableCell>
    );
  },
);

export interface TableExpandableRowProps extends TableRowProps {
  expanded: boolean;
  onToggle?: (next: boolean) => void;
  expandLabel?: string;
  /** The data cells rendered after the 48px expand control. */
  children: ReactNode;
}

// Parent row of an expandable group: a 48px chevron control (› closed / ⌄ open)
// plus the row's data cells. Render the matching <TableSubRow>s after it when
// `expanded`; the chevron and the sub-rows' connector gutter align at x=24px.
export const TableExpandableRow = forwardRef<
  HTMLTableRowElement,
  TableExpandableRowProps
>(function TableExpandableRow(
  { expanded, onToggle, expandLabel = "Toggle row", children, ...rest },
  ref,
) {
  return (
    <TableRow ref={ref} {...rest}>
      <TableCell checkbox>
        <IconButton
          className="d2e-table__expand"
          size="sm"
          ariaLabel={expandLabel}
          aria-expanded={expanded}
          onClick={() => onToggle?.(!expanded)}
        >
          {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
        </IconButton>
      </TableCell>
      {children}
    </TableRow>
  );
});

export interface TableSubRowProps extends TableRowProps {
  /** Last child in the group — the connector becomes an └ (line stops at centre). */
  last?: boolean;
  /**
   * Section-header row inside the expanded panel (e.g. "Cache data source"):
   * a full-width shaded band with no connector gutter (Figma). Pass a single
   * cell spanning every column (`colSpan`); its label aligns to the table's
   * left edge like the column headers, not to the sub-rows' connector gutter.
   */
  header?: boolean;
  /** The data cells rendered after the connector gutter. */
  children: ReactNode;
}

// A nested row under an expandable parent. Data sub-rows lead with a connector
// gutter drawing the tree line/tick; the section header is a full-width band
// with no gutter, so its label aligns left with the column headers.
export const TableSubRow = forwardRef<HTMLTableRowElement, TableSubRowProps>(
  function TableSubRow({ last = false, header = false, className, children, ...rest }, ref) {
    return (
      <TableRow
        ref={ref}
        className={clsx(
          "d2e-table__subrow",
          header && "d2e-table__subrow--header",
          className,
        )}
        {...rest}
      >
        {!header && (
          <TableCell
            checkbox
            aria-hidden="true"
            className={clsx(
              "d2e-table__connector",
              last && "d2e-table__connector--last",
            )}
          />
        )}
        {children}
      </TableRow>
    );
  },
);

export default Table;
