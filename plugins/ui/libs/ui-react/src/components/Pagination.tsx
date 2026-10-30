import FirstPageIcon from "@mui/icons-material/FirstPage";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LastPageIcon from "@mui/icons-material/LastPage";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import clsx from "clsx";
import { IconButton } from "./IconButton";
import "./Pagination.scss";

export interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemsPerPageLabel?: string;
  /** Build the "1-10 of 123" range string (i18n hook). */
  rangeLabel?: (start: number, end: number, total: number) => string;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemsPerPageLabel = "Items per page:",
  rangeLabel = (start, end, total) => `${start}-${end} of ${total}`,
  className,
}: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const current = Math.min(Math.max(1, page), lastPage);
  const start = totalCount === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, totalCount);
  const atStart = current <= 1;
  const atEnd = current >= lastPage;

  return (
    <div className={clsx("d2e-pagination", className)}>
      <div className="d2e-pagination__page-size">
        <span className="d2e-pagination__label">{itemsPerPageLabel}</span>
        <div className="d2e-pagination__select">
          <select
            className="d2e-pagination__select-input"
            aria-label={itemsPerPageLabel}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ArrowDropDownIcon className="d2e-pagination__select-icon" />
        </div>
      </div>

      <div className="d2e-pagination__range-nav">
        <span className="d2e-pagination__range">
          {rangeLabel(start, end, totalCount)}
        </span>
        <div className="d2e-pagination__nav">
          <IconButton
            icon={<FirstPageIcon />}
            ariaLabel="First page"
            disabled={atStart}
            onClick={() => onPageChange(1)}
          />
          <IconButton
            icon={<ChevronLeftIcon />}
            ariaLabel="Previous page"
            disabled={atStart}
            onClick={() => onPageChange(current - 1)}
          />
          <IconButton
            icon={<ChevronRightIcon />}
            ariaLabel="Next page"
            disabled={atEnd}
            onClick={() => onPageChange(current + 1)}
          />
          <IconButton
            icon={<LastPageIcon />}
            ariaLabel="Last page"
            disabled={atEnd}
            onClick={() => onPageChange(lastPage)}
          />
        </div>
      </div>
    </div>
  );
}

export default Pagination;
