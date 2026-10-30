import { Suspense, lazy, useId, useMemo } from "react";
import type { ComponentType } from "react";
import clsx from "clsx";
import "./MarkdownField.scss";

type EditorProps = {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  options?: Record<string, unknown>;
};

// SimpleMDE (CodeMirror) is heavy, so the editor and its stylesheet load only
// when a MarkdownField actually renders. react-simplemde-editor / easymde are
// peerDependencies — kept out of the ui-react bundle.
const LazyEditor = lazy(async () => {
  await import("easymde/dist/easymde.min.css");
  return import("react-simplemde-editor");
}) as unknown as ComponentType<EditorProps>;

type ToolbarOption = false | ReadonlyArray<string | Record<string, unknown>>;
type StatusOption = false | ReadonlyArray<string | Record<string, unknown>>;

const DEFAULT_HIDE_ICONS = ["side-by-side", "fullscreen"];

export interface MarkdownFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  required?: boolean;
  errorMessages?: string | string[];
  disabled?: boolean;
  placeholder?: string;
  maxHeight?: string;
  className?: string;
  /** EasyMDE `toolbar` — array of button names / custom buttons / "|" separators, or `false` to hide the toolbar. Overrides `hideIcons`/`showIcons`. */
  toolbar?: ToolbarOption;
  /** EasyMDE `status` footer items (e.g. `["lines", "words", "cursor"]`), or `false` to hide the status bar. Defaults to hidden. */
  status?: StatusOption;
  /** Built-in toolbar icons to hide. Defaults to hiding side-by-side & fullscreen. Ignored when `toolbar` is set. */
  hideIcons?: string[];
  /** Built-in toolbar icons to force-show. Ignored when `toolbar` is set. */
  showIcons?: string[];
}

export function MarkdownField({
  value,
  onChange,
  label,
  required = false,
  errorMessages,
  disabled = false,
  placeholder,
  maxHeight = "150px",
  className,
  toolbar,
  status,
  hideIcons,
  showIcons,
}: MarkdownFieldProps) {
  const id = useId();
  const messages = Array.isArray(errorMessages)
    ? errorMessages
    : errorMessages
      ? [errorMessages]
      : [];
  const error = messages.length > 0;

  const options = useMemo(() => {
    const opts: Record<string, unknown> = {
      maxHeight,
      placeholder,
      hideIcons: hideIcons ?? DEFAULT_HIDE_ICONS,
    };
    if (showIcons !== undefined) opts.showIcons = showIcons;
    if (toolbar !== undefined) opts.toolbar = toolbar;
    opts.status = status === undefined ? false : status;
    return opts;
  }, [maxHeight, placeholder, hideIcons, showIcons, toolbar, status]);

  return (
    <div
      className={clsx(
        "d2e-field",
        "d2e-markdown-field",
        error && "d2e-markdown-field--error",
        disabled && "d2e-markdown-field--disabled",
        className,
      )}
    >
      {label != null && (
        <label className="d2e-markdown-field__label" htmlFor={id}>
          {label}
          {required ? " *" : ""}
        </label>
      )}
      <div className="d2e-markdown-field__editor">
        <Suspense
          fallback={<div className="d2e-markdown-field__loading" style={{ minHeight: maxHeight }} />}
        >
          <LazyEditor id={id} value={value} onChange={onChange} options={options} />
        </Suspense>
      </div>
      {error && <div className="d2e-markdown-field__error">{messages[0]}</div>}
    </div>
  );
}

export default MarkdownField;
