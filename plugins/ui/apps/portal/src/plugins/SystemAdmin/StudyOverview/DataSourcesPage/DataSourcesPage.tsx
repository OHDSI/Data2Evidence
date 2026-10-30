import { Fragment, useMemo, useRef, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import InputAdornment from "@mui/material/InputAdornment";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import {
  buildMuiTheme,
  PageHeader,
  Button,
  Tabs,
  Tab,
  TextField,
  Spinner,
  EmptyState,
  Pagination,
  Tooltip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableExpandableRow,
  TableSubRow,
} from "ui-react";
import { Study } from "../../../../types";
import { useTranslation } from "../../../../contexts";
import { useDataSourceController, StudyAttributeConfigIds } from "../useDataSourceController";
import { DataSourceDialogs } from "../DataSourceDialogs";
import { DataSourceRowMenu } from "./DataSourceRowMenu";
import { StudyRowMenu } from "./StudyRowMenu";
import "./DataSourcesPage.scss";

const theme = buildMuiTheme();
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type DsRow = Study & { children?: Study[] };

function CopyCell({ value, className }: { value?: string; className?: string }) {
  const { getText, i18nKeys } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!value) return <span className={className}>-</span>;

  const copy = (event?: { stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
    navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <Tooltip
        placement="bottom-start"
        title={
          <span className="d2e-ds__copytip">
            <span className="d2e-ds__copytip-value">{value}</span>
            <span className="d2e-ds__copytip-action">
              {copied ? <CheckIcon fontSize="inherit" /> : <ContentCopyIcon fontSize="inherit" />}
              {copied ? getText(i18nKeys.STUDY_OVERVIEW__COPIED) : getText(i18nKeys.STUDY_OVERVIEW__CLICK_TO_COPY)}
            </span>
          </span>
        }
      >
        <span
          className={`d2e-ds__copy${className ? ` ${className}` : ""}`}
          role="button"
          tabIndex={0}
          onClick={(event) => copy(event)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              copy();
            }
          }}
        >
          {value}
        </span>
      </Tooltip>
      <span className="d2e-ds__sr-only" aria-live="polite">
        {copied ? getText(i18nKeys.STUDY_OVERVIEW__COPIED) : ""}
      </span>
    </>
  );
}

function TruncCell({ value, className }: { value?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  if (!value) return <span className={className}>-</span>;

  const handleOpen = () => {
    const el = ref.current;
    if (el && el.scrollWidth > el.clientWidth) setOpen(true);
  };
  const handleClose = () => setOpen(false);

  return (
    <Tooltip open={open} onClose={handleClose} title={value} placement="bottom-start">
      <span
        ref={ref}
        className={`d2e-ds__trunc${className ? ` ${className}` : ""}`}
        tabIndex={0}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
      >
        {value}
      </span>
    </Tooltip>
  );
}

export function DataSourcesPage() {
  const { getText, i18nKeys } = useTranslation();
  const ctrl = useDataSourceController();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const resetPaging = () => setPage(1);

  const sortValue = (ds: Study, col: string): string => {
    switch (col) {
      case "id":
        return ds.id;
      case "name":
        return ds.studyDetail?.name ?? "";
      case "schema":
        return ds.schemaName ?? "";
      case "version":
        return ctrl.getAttributeDisplay(ds.attributes, StudyAttributeConfigIds.SCHEMA_VERSION);
      case "latest":
        return ctrl.getAttributeDisplay(ds.attributes, StudyAttributeConfigIds.LATEST_SCHEMA_VERSION);
      case "dataModel":
        return ds.dataModel ?? "";
      case "type":
        return ds.type ?? "";
      default:
        return "";
    }
  };

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    resetPaging();
  };

  const tabRows: DsRow[] = useMemo(() => {
    if (tab === 1) return ctrl.fhirDatasets;
    if (tab === 2) return ctrl.strategusAnalysisDatasets;
    return ctrl.sourceOmopHanaDatasets;
  }, [tab, ctrl.fhirDatasets, ctrl.strategusAnalysisDatasets, ctrl.sourceOmopHanaDatasets]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tabRows;
    return tabRows.filter((row) => {
      const name = row.studyDetail?.name ?? "";
      return (
        row.id.toLowerCase().includes(term) ||
        name.toLowerCase().includes(term) ||
        (row.schemaName ?? "").toLowerCase().includes(term)
      );
    });
  }, [tabRows, search]);

  const sortedRows = useMemo(() => {
    if (!sortCol) return filteredRows;
    const arr = [...filteredRows].sort((a, b) =>
      sortValue(a, sortCol).localeCompare(sortValue(b, sortCol), undefined, { numeric: true })
    );
    return sortDir === "asc" ? arr : arr.reverse();
  }, [filteredRows, sortCol, sortDir]);

  const pageRows = useMemo(
    () => sortedRows.slice((page - 1) * pageSize, page * pageSize),
    [sortedRows, page, pageSize]
  );

  const nameOf = (ds: Study) => ds.studyDetail?.name || getText(i18nKeys.STUDY_OVERVIEW__UNTITLED);

  const dataModelCell = (ds: Study) => {
    if (ds.dataModel) return <TruncCell value={`${ds.dataModel} [${ds.plugin}]`} />;
    if (ds.fhirStudyId) {
      return (
        <Tooltip title={ds.fhirStudyId} placement="top">
          <span>{getText(i18nKeys.STUDY_OVERVIEW__FHIR_SERVER)}</span>
        </Tooltip>
      );
    }
    return "-";
  };

  const dataCells = (ds: Study, showSchemaVersions: boolean) => (
    <>
      <TableCell>
        <CopyCell value={ds.id} className="d2e-ds__mono" />
      </TableCell>
      <TableCell>
        <TruncCell value={nameOf(ds)} />
      </TableCell>
      <TableCell>
        <CopyCell value={ds.schemaName} className="d2e-ds__trunc" />
      </TableCell>
      {showSchemaVersions && (
        <>
          <TableCell>
            <TruncCell value={ctrl.getAttributeDisplay(ds.attributes, StudyAttributeConfigIds.SCHEMA_VERSION)} />
          </TableCell>
          <TableCell>
            <TruncCell value={ctrl.getAttributeDisplay(ds.attributes, StudyAttributeConfigIds.LATEST_SCHEMA_VERSION)} />
          </TableCell>
        </>
      )}
      <TableCell>{dataModelCell(ds)}</TableCell>
      <TableCell>
        <TruncCell value={ds.type} />
      </TableCell>
      <TableCell align="right">
        <DataSourceRowMenu dataset={ds} ctrl={ctrl} />
      </TableCell>
    </>
  );

  const renderDataSourceTable = (hasExpand: boolean, showSchemaVersions: boolean) => {
    const colSpan = (hasExpand ? 1 : 0) + 3 + (showSchemaVersions ? 2 : 0) + 2 + 1;
    return (
    <Table className={hasExpand ? "d2e-ds__table--expandable" : undefined}>
      <TableHead>
        <TableRow>
          {hasExpand && <TableCell header />}
          <TableCell header sortable sortDirection={sortCol === "id" ? sortDir : false} onSort={() => toggleSort("id")}>
            {getText(i18nKeys.STUDY_OVERVIEW__DATA_SOURCE_ID)}
          </TableCell>
          <TableCell header sortable sortDirection={sortCol === "name" ? sortDir : false} onSort={() => toggleSort("name")}>
            {getText(i18nKeys.STUDY_OVERVIEW__NAME)}
          </TableCell>
          <TableCell header sortable sortDirection={sortCol === "schema" ? sortDir : false} onSort={() => toggleSort("schema")}>
            {getText(i18nKeys.STUDY_OVERVIEW__SCHEMA_NAME)}
          </TableCell>
          {showSchemaVersions && (
            <>
              <TableCell header sortable sortDirection={sortCol === "version" ? sortDir : false} onSort={() => toggleSort("version")}>
                {getText(i18nKeys.STUDY_OVERVIEW__SCHEMA_VERSION)}
              </TableCell>
              <TableCell header sortable sortDirection={sortCol === "latest" ? sortDir : false} onSort={() => toggleSort("latest")}>
                {getText(i18nKeys.STUDY_OVERVIEW__LATEST_AVAILABLE)}
              </TableCell>
            </>
          )}
          <TableCell header sortable sortDirection={sortCol === "dataModel" ? sortDir : false} onSort={() => toggleSort("dataModel")}>
            {getText(i18nKeys.STUDY_OVERVIEW__DATA_MODEL)}
          </TableCell>
          <TableCell header sortable sortDirection={sortCol === "type" ? sortDir : false} onSort={() => toggleSort("type")}>
            {getText(i18nKeys.STUDY_OVERVIEW__TYPE)}
          </TableCell>
          <TableCell header />
        </TableRow>
      </TableHead>
      <TableBody>
        {pageRows.map((ds) => {
          const children = ds.children ?? [];
          const hasChildren = children.length > 0;
          const expanded = !!ctrl.expandedRows[ds.id];
          return (
            <Fragment key={ds.id}>
              {hasChildren ? (
                <TableExpandableRow
                  hover
                  expanded={expanded}
                  onToggle={() => ctrl.toggleRow(ds.id)}
                  expandLabel={nameOf(ds)}
                >
                  {dataCells(ds, showSchemaVersions)}
                </TableExpandableRow>
              ) : (
                <TableRow hover>
                  {hasExpand && <TableCell />}
                  {dataCells(ds, showSchemaVersions)}
                </TableRow>
              )}
              {hasChildren && expanded && (
                <>
                  <TableSubRow header>
                    <TableCell colSpan={colSpan}>{getText(i18nKeys.STUDY_OVERVIEW__CACHE_DATASETS)}</TableCell>
                  </TableSubRow>
                  {children.map((child, i) => (
                    <TableSubRow key={child.id} last={i === children.length - 1}>
                      {dataCells(child, showSchemaVersions)}
                    </TableSubRow>
                  ))}
                </>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
    );
  };

  const renderStudiesTable = () => (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell header>{getText(i18nKeys.STUDY_OVERVIEW__NAME)}</TableCell>
          <TableCell header>{getText(i18nKeys.STUDY_OVERVIEW__SCHEMA_NAME)}</TableCell>
          <TableCell header>{getText(i18nKeys.STUDY_OVERVIEW__CREATED_AT)}</TableCell>
          <TableCell header>{getText(i18nKeys.STUDY_OVERVIEW__UPDATED_AT)}</TableCell>
          <TableCell header />
        </TableRow>
      </TableHead>
      <TableBody>
        {pageRows.map((ds) => (
          <TableRow key={ds.id} hover>
            <TableCell>
              <TruncCell value={nameOf(ds)} />
            </TableCell>
            <TableCell>
              <CopyCell value={ds.schemaName} className="d2e-ds__trunc" />
            </TableCell>
            <TableCell>
              <TruncCell
                value={
                  ds.strategusAnalysis?.createdAt
                    ? new Date(ds.strategusAnalysis.createdAt).toLocaleDateString()
                    : undefined
                }
              />
            </TableCell>
            <TableCell>
              <TruncCell
                value={
                  ds.strategusAnalysis?.updatedAt
                    ? new Date(ds.strategusAnalysis.updatedAt).toLocaleDateString()
                    : undefined
                }
              />
            </TableCell>
            <TableCell align="right">
              {ds.strategusAnalysis && <StudyRowMenu study={ds.strategusAnalysis} ctrl={ctrl} />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const content = () => {
    if (ctrl.loadingDatasets || (tab === 2 && ctrl.loadingStrategusStudies)) {
      return (
        <div className="d2e-ds__content d2e-ds__content--center">
          <Spinner center />
        </div>
      );
    }
    if (filteredRows.length === 0) {
      return (
        <div className="d2e-ds__content d2e-ds__content--center">
          <EmptyState title={getText(i18nKeys.STUDY_OVERVIEW__NO_DATA)} description="" />
        </div>
      );
    }
    return (
      <div className="d2e-ds__content">
        <div className="d2e-ds__tablewrap">
          {tab === 2
            ? renderStudiesTable()
            : renderDataSourceTable(
                tabRows.some((row) => (row.children?.length ?? 0) > 0),
                tab === 0
              )}
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={filteredRows.length}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            resetPaging();
          }}
        />
      </div>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="d2e-ds">
        <div className="d2e-ds__card">
        <PageHeader
          overline={getText(i18nKeys.STUDY_OVERVIEW__ADMIN)}
          title={getText(i18nKeys.STUDY_OVERVIEW__TITLE)}
          actions={
            <>
              <Button variant="secondary" prependIcon={<AddIcon />} onClick={ctrl.openAddStrategusStudyDialog}>
                {getText(i18nKeys.STUDY_OVERVIEW__ADD_STUDY)}
              </Button>
              <Button variant="primary" prependIcon={<AddIcon />} onClick={ctrl.openAddStudyDialog}>
                {getText(i18nKeys.STUDY_OVERVIEW__ADD_DATA_SOURCE)}
              </Button>
            </>
          }
        />

        <Tabs
          value={tab}
          onChange={(next) => {
            setTab(next);
            resetPaging();
          }}
        >
          <Tab label={getText(i18nKeys.STUDY_OVERVIEW__OMOP_DATA_SOURCE)} />
          <Tab label={getText(i18nKeys.STUDY_OVERVIEW__FHIR_DATA_SOURCE)} />
          <Tab label={getText(i18nKeys.STUDY_OVERVIEW__STUDIES)} />
        </Tabs>

        <div className="d2e-ds__toolbar">
          <TextField
            className="d2e-ds__search"
            placeholder={getText(i18nKeys.STUDY_OVERVIEW__SEARCH)}
            value={search}
            onChange={(value) => {
              setSearch(value);
              resetPaging();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {/* Temporarily hidden
          <Button variant="secondary" prependIcon={<FilterListIcon />}>
            {getText(i18nKeys.STUDY_OVERVIEW__FILTERS)}
          </Button>
          */}
          {tab === 0 && (
            <div className="d2e-ds__toolbar-end">
              <Button
                variant="secondary"
                loading={ctrl.fetchUpdatesLoading}
                onClick={ctrl.fetchDatamodelUpdates}
              >
                {getText(i18nKeys.STUDY_OVERVIEW__UPDATE_METADATA)}
              </Button>
            </div>
          )}
        </div>

        {content()}
        </div>

        <DataSourceDialogs ctrl={ctrl} />
      </div>
    </ThemeProvider>
  );
}

export default DataSourcesPage;
