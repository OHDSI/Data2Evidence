import React, { FC, useState } from "react";
import classNames from "classnames";
import CheckIcon from "@mui/icons-material/Check";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { useTranslation } from "../../contexts";
import { ToolActivity } from "./types";

// A tool result is arbitrary JSON and can be long — a concept search returns every
// match it found. The row is a record of the call, not a data viewer, so cap what
// gets pasted into the DOM.
const DETAIL_LIMIT = 2000;

const formatDetail = (value: unknown): string => {
  if (value == null) return "";
  let text: string;
  if (typeof value === "string") {
    text = value;
  } else {
    try {
      text = JSON.stringify(value, null, 2) ?? "";
    } catch {
      // Tool output crosses the wire as JSON, so this should not happen — but a
      // cycle here would take the whole conversation down with it.
      text = String(value);
    }
  }
  return text.length > DETAIL_LIMIT ? `${text.slice(0, DETAIL_LIMIT)}…` : text;
};

interface ToolCallRowProps {
  tool: ToolActivity;
}

/**
 * One tool call, rendered in the conversation flow above the reply it produced
 * rather than inside the reply bubble: the tools are what the assistant *did*,
 * and folding them into the answer made a cohort edit read like a badge on a
 * sentence. Collapsed it is a single quiet line; expanded it shows the actual
 * arguments and result.
 *
 * Tool names are the agent's ids (pa_apply_cohort_patch, search_concepts, …),
 * shown as-is minus the surface prefix: they are the honest record of what ran,
 * and inventing friendly names for a set that grows on both the browser and
 * server side would drift out of date silently.
 */
export const ToolCallRow: FC<ToolCallRowProps> = ({ tool }) => {
  const { getText, i18nKeys } = useTranslation();
  const [open, setOpen] = useState(false);

  const input = formatDetail(tool.input);
  const output = formatDetail(tool.state === "error" ? tool.errorText : tool.output);
  const expandable = Boolean(input || output);

  const verbKey =
    tool.state === "running"
      ? i18nKeys.AI_ASSISTANT__TOOL_RUNNING
      : tool.state === "error"
      ? i18nKeys.AI_ASSISTANT__TOOL_FAILED
      : i18nKeys.AI_ASSISTANT__TOOL_RAN;

  const summary = (
    <>
      <span className="ai-assistant__tool-status" aria-hidden="true">
        {tool.state === "running" && <span className="ai-assistant__tool-spinner" />}
        {tool.state === "ok" && <CheckIcon fontSize="inherit" />}
        {tool.state === "error" && <ErrorOutlineIcon fontSize="inherit" />}
      </span>
      <span className="ai-assistant__tool-verb">{getText(verbKey)}</span>
      <span className="ai-assistant__tool-name">{tool.name.replace(/^pa_/, "")}</span>
      {expandable && <KeyboardArrowRightIcon className="ai-assistant__tool-chevron" fontSize="inherit" />}
    </>
  );

  return (
    <div
      className={classNames("ai-assistant__tool", `ai-assistant__tool--${tool.state}`, {
        "ai-assistant__tool--open": open,
      })}
      data-testid={`ai-tool-${tool.name}`}
    >
      {expandable ? (
        <button
          type="button"
          className="ai-assistant__tool-summary"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          title={getText(open ? i18nKeys.AI_ASSISTANT__TOOL_HIDE_DETAILS : i18nKeys.AI_ASSISTANT__TOOL_SHOW_DETAILS)}
          data-testid={`ai-tool-toggle-${tool.name}`}
        >
          {summary}
        </button>
      ) : (
        <div className="ai-assistant__tool-summary">{summary}</div>
      )}

      {open && (
        <div className="ai-assistant__tool-detail" data-testid={`ai-tool-detail-${tool.name}`}>
          {input && (
            <>
              <p className="ai-assistant__tool-detail-label">{getText(i18nKeys.AI_ASSISTANT__TOOL_REQUEST)}</p>
              <pre>{input}</pre>
            </>
          )}
          {output && (
            <>
              <p className="ai-assistant__tool-detail-label">
                {getText(
                  tool.state === "error" ? i18nKeys.AI_ASSISTANT__TOOL_ERROR : i18nKeys.AI_ASSISTANT__TOOL_RESPONSE
                )}
              </p>
              <pre>{output}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
};
