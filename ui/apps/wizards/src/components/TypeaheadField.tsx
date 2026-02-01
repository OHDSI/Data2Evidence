import { useState, useRef, useEffect, useCallback } from "react";
import { Controller, type Control } from "react-hook-form";
import { fetchAttributeValues } from "../config/cdwConfig";
import type { ConfigMeta } from "../config/cdwConfig";
import styles from "./StepForm.module.css";

interface TypeaheadFieldProps {
  fieldId: string;
  label: string;
  placeholder?: string;
  required: boolean;
  configPath: string;
  configMeta: ConfigMeta;
  datasetId?: string;
  control: Control<any>;
  defaultValue?: string;
  error?: { message?: string };
}

interface Option {
  label: string;
  value: string;
}

/**
 * Filter and sort options: exact matches first, then starts-with, then contains.
 * Case-insensitive. Returns all options if query is empty.
 */
function filterAndSort(items: Option[], query: string): Option[] {
  if (!query) return items;
  const q = query.toLowerCase();
  const exact: Option[] = [];
  const startsWith: Option[] = [];
  const contains: Option[] = [];

  for (const item of items) {
    const label = item.label.toLowerCase();
    if (label === q) exact.push(item);
    else if (label.startsWith(q)) startsWith.push(item);
    else if (label.includes(q)) contains.push(item);
  }

  return [...exact, ...startsWith, ...contains];
}

export function TypeaheadField({
  fieldId,
  label,
  placeholder,
  required,
  configPath,
  configMeta,
  datasetId,
  control,
  defaultValue = "",
  error,
}: TypeaheadFieldProps) {
  const [inputText, setInputText] = useState(defaultValue);
  const [options, setOptions] = useState<Option[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const hasSelection = useRef(!!defaultValue);
  const inputTextRef = useRef(defaultValue);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastQueryRef = useRef<string | null>(null);

  const fetchOptions = useCallback(
    async (query: string) => {
      if (query === lastQueryRef.current) return;
      lastQueryRef.current = query;
      setLoading(true);
      try {
        const results = await fetchAttributeValues(configPath, configMeta, datasetId, query);
        setOptions(filterAndSort(results, query));
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [configPath, configMeta, datasetId],
  );

  // Prefetch initial options on mount
  useEffect(() => {
    fetchOptions("");
  }, [fetchOptions]);

  const debouncedFetch = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchOptions(query), 300);
    },
    [fetchOptions],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Controller
      name={fieldId}
      control={control}
      defaultValue={defaultValue}
      rules={{
        required: required ? `${label} is required` : false,
        validate: () => {
          // No text typed and no selection → empty field, valid (required rule handles emptiness)
          if (!inputTextRef.current) return true;
          // Text present but not from dropdown selection → invalid
          if (!hasSelection.current) return `Please select a ${label} from the dropdown`;
          return true;
        },
      }}
      render={({ field: controllerField }) => {
        const handleFocus = () => {
          setIsOpen(true);
          fetchOptions(inputText);
        };

        const handleInputChange = (text: string) => {
          setInputText(text);
          inputTextRef.current = text;
          hasSelection.current = false;
          // Clear the selected value — user is typing new text
          controllerField.onChange("");
          setIsOpen(true);
          setHighlightIndex(-1);
          debouncedFetch(text);
        };

        const handleSelect = (option: Option) => {
          setInputText(option.label);
          hasSelection.current = true;
          controllerField.onChange(option.value);
          setIsOpen(false);
          setHighlightIndex(-1);
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (!isOpen) return;

          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((prev) => Math.min(prev + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((prev) => Math.max(prev - 1, 0));
          } else if (e.key === "Enter" && highlightIndex >= 0) {
            e.preventDefault();
            handleSelect(options[highlightIndex]);
          } else if (e.key === "Escape") {
            setIsOpen(false);
          }
        };

        return (
          <div ref={wrapperRef} className={styles.typeaheadWrapper}>
            <input
              id={fieldId}
              type="text"
              value={inputText}
              placeholder={placeholder || `Search ${label}`}
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              aria-invalid={!!error}
              autoComplete="off"
              onFocus={handleFocus}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {isOpen && (
              <ul className={styles.typeaheadDropdown} role="listbox">
                {loading && <li className={styles.typeaheadMessage}>Loading...</li>}
                {!loading && options.length === 0 && <li className={styles.typeaheadMessage}>No results</li>}
                {!loading &&
                  options.map((option, i) => (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={i === highlightIndex}
                      className={`${styles.typeaheadOption} ${i === highlightIndex ? styles.typeaheadOptionHighlighted : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(option);
                      }}
                      onMouseEnter={() => setHighlightIndex(i)}
                    >
                      {option.label}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        );
      }}
    />
  );
}
