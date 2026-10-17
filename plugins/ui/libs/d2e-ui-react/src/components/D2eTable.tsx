import { forwardRef } from "react";
import Table, { type TableProps } from "@mui/material/Table";
import TableHead, { type TableHeadProps } from "@mui/material/TableHead";
import TableBody, { type TableBodyProps } from "@mui/material/TableBody";
import TableRow, { type TableRowProps } from "@mui/material/TableRow";
import TableCell, { type TableCellProps } from "@mui/material/TableCell";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { ReactNode } from "react";
import clsx from "clsx";
import { D2eIconButton } from "./D2eIconButton";
import "./D2eTable.scss";

export const D2eTable = forwardRef<HTMLTableElement, TableProps>(function D2eTable(
  { className, ...rest },
  ref,
) {
  return <Table ref={ref} className={clsx("d2e-table", className)} {...rest} />;
});

export const D2eTableHead = forwardRef<HTMLTableSectionElement, TableHeadProps>(
  function D2eTableHead({ className, ...rest }, ref) {
    return (
      <TableHead ref={ref} className={clsx("d2e-table__head", className)} {...rest} />
    );
  },
);

export const D2eTableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  function D2eTableBody({ className, ...rest }, ref) {
    return (
      <TableBody ref={ref} className={clsx("d2e-table__body", className)} {...rest} />
    );
  },
);

export interface D2eTableRowProps extends TableRowProps {
  /** Left accent bar (Figma: selected rows with a checkbox get a #999FCB rule). */
  accent?: boolean;
}

export const D2eTableRow = forwardRef<HTMLTableRowElement, D2eTableRowProps>(
  function D2eTableRow({ accent = false, className, ...rest }, ref) {
    return (
      <TableRow
        ref={ref}
        className={clsx("d2e-table__row", accent && "d2e-table__row--accent", className)}
        {...rest}
      />
    );
  },
);

export interface D2eTableCellProps extends Omit<TableCellProps, "variant"> {
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

export const D2eTableCell = forwardRef<HTMLTableCellElement, D2eTableCellProps>(
  function D2eTableCell(
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
        <UnfoldMoreIcon />
      );

    return (
      <TableCell
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
      </TableCell>
    );
  },
);

export interface D2eTableExpandableRowProps extends D2eTableRowProps {
  expanded: boolean;
  onToggle?: (next: boolean) => void;
  expandLabel?: string;
  /** The data cells rendered after the 48px expand control. */
  children: ReactNode;
}

// Parent row of an expandable group: a 48px chevron control (› closed / ⌄ open)
// plus the row's data cells. Render the matching <D2eTableSubRow>s after it when
// `expanded`; the chevron and the sub-rows' connector gutter align at x=24px.
export const D2eTableExpandableRow = forwardRef<
  HTMLTableRowElement,
  D2eTableExpandableRowProps
>(function D2eTableExpandableRow(
  { expanded, onToggle, expandLabel = "Toggle row", children, ...rest },
  ref,
) {
  return (
    <D2eTableRow ref={ref} {...rest}>
      <D2eTableCell checkbox>
        <D2eIconButton
          size="sm"
          ariaLabel={expandLabel}
          aria-expanded={expanded}
          onClick={() => onToggle?.(!expanded)}
        >
          {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
        </D2eIconButton>
      </D2eTableCell>
      {children}
    </D2eTableRow>
  );
});

export interface D2eTableSubRowProps extends D2eTableRowProps {
  /** Last child in the group — the connector becomes an └ (line stops at centre). */
  last?: boolean;
  /**
   * Section-header row inside the expanded panel (e.g. "Cache data source"):
   * shaded, Medium text, and the connector line passes through without a tick.
   */
  header?: boolean;
  /** The data cells rendered after the connector gutter. */
  children: ReactNode;
}

// A nested row under an expandable parent. Its first cell is a connector gutter
// drawing the tree line/tick; remaining cells align to the parent's columns.
export const D2eTableSubRow = forwardRef<HTMLTableRowElement, D2eTableSubRowProps>(
  function D2eTableSubRow({ last = false, header = false, className, children, ...rest }, ref) {
    return (
      <D2eTableRow
        ref={ref}
        className={clsx(
          "d2e-table__subrow",
          header && "d2e-table__subrow--header",
          className,
        )}
        {...rest}
      >
        <D2eTableCell
          checkbox
          aria-hidden="true"
          className={clsx(
            "d2e-table__connector",
            last && "d2e-table__connector--last",
            header && "d2e-table__connector--notick",
          )}
        />
        {children}
      </D2eTableRow>
    );
  },
);

export default D2eTable;
