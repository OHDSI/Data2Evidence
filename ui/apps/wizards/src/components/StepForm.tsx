import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useWizardContext } from "../context/WizardContext";
import type { FieldDefinition, FormStepConfig } from "../types/wizard";
import { generateFormSubmitDeepLink } from "../utils/deepLinks";
import { fetchCdwConfig } from "../config/cdwConfig";
import type { ConfigMeta } from "../config/cdwConfig";
import { TypeaheadField } from "./TypeaheadField";
import styles from "./StepForm.module.css";

/**
 * Form step renderer with config-driven fields.
 */
export function StepForm() {
  const { selectedWizard, formData, updateFormData, goBack, goForward, getCurrentStepConfig, portalProps } =
    useWizardContext();
  const stepConfig = getCurrentStepConfig();
  const [configMeta, setConfigMeta] = useState<ConfigMeta | null>(null);
  const displayValuesRef = useRef<Record<string, string>>({});

  const handleDisplayValueChange = useCallback((fieldId: string, displayValue: string | null) => {
    if (displayValue) {
      displayValuesRef.current[fieldId] = displayValue;
    } else {
      delete displayValuesRef.current[fieldId];
    }
  }, []);

  useEffect(() => {
    fetchCdwConfig(portalProps.datasetId).then(({ meta }) => setConfigMeta(meta));
  }, [portalProps.datasetId]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm({
    mode: "onChange",
    defaultValues: formData,
  });

  // Watch all form values to check if required fields are filled
  const formValues = watch();

  // Check if all required fields have values
  const allRequiredFieldsFilled = useCallback(() => {
    if (!selectedWizard) return false;
    for (const field of selectedWizard.fields) {
      if (field.required) {
        const value = formValues[field.id];
        if (!value || value === "") return false;
      }
    }
    return true;
  }, [selectedWizard, formValues]);

  const onSubmit = async (data: Record<string, any>) => {
    updateFormData(data);

    // Check stepConfig for submitAction
    const formStepConfig = stepConfig?.config as FormStepConfig | undefined;
    const submitAction = formStepConfig?.submitAction || "next-step";

    console.log("[Wizards StepForm] Submit action:", submitAction);

    if (submitAction === "deep-link") {
      try {
        // Generate deep link URL
        if (!selectedWizard) {
          console.error("[Wizards StepForm] Cannot generate deep link: No wizard selected");
          goForward();
          return;
        }

        // Combine existing formData with new data
        const combinedFormData = { ...formData, ...data };

        // Fetch config meta (cached from wizard load)
        const { config: cdwConfig, meta: configMeta } = await fetchCdwConfig(portalProps.datasetId);

        const mriFields = selectedWizard.fields.filter((f) => !f.isWizardField);
        const wizardOnlyFields = selectedWizard.fields.filter((f) => f.isWizardField);

        const deepLinkUrl = generateFormSubmitDeepLink(
          mriFields,
          combinedFormData,
          configMeta,
          portalProps.datasetId,
          cdwConfig.chartOptions,
          cdwConfig,
          wizardOnlyFields,
          selectedWizard.id,
          displayValuesRef.current,
        );

        console.log("[Wizards StepForm] Generated deep link:", deepLinkUrl);

        // Navigate to the deep link
        window.location.href = deepLinkUrl;
      } catch (error) {
        console.error("[Wizards StepForm] Failed to generate deep link:", error);
        // Fall back to goForward on error
        goForward();
      }
    } else {
      // Default behavior: next-step or undefined
      goForward();
    }
  };

  const renderField = (field: FieldDefinition) => {
    const fieldError = errors[field.id];

    // Text fields with configPath use typeahead search
    if (field.type === "text" && field.configPath && configMeta) {
      const isConditionField = field.id.startsWith("condition");
      const fieldValue = formValues[field.id];
      return (
        <div key={field.id} className={styles.fieldGroup}>
          <label htmlFor={field.id} className={styles.label}>
            {field.label}:
          </label>
          <div className={styles.inputWithToggle}>
            <TypeaheadField
              fieldId={field.id}
              label={field.label}
              placeholder={field.placeholder}
              required={field.required}
              configPath={field.configPath}
              configMeta={configMeta}
              datasetId={portalProps.datasetId}
              control={control}
              setValue={setValue}
              defaultValue={formData[field.id] ?? ""}
              error={fieldError as { message?: string } | undefined}
              onDisplayValueChange={handleDisplayValueChange}
              allowFreeText={field.allowFreeText}
            />
            {isConditionField && fieldValue && (
              <div className={styles.wildcardToggle}>
                <input type="checkbox" id={`${field.id}_wildcard`} {...register(`${field.id}_wildcard`)} />
                <label htmlFor={`${field.id}_wildcard`}>Include descendants</label>
              </div>
            )}
          </div>
          {fieldError ? (
            <span className={styles.errorMessage} role="alert">
              {fieldError.message as string}
            </span>
          ) : (
            field.required && !fieldValue && <span className={styles.requiredText}>This is a required field</span>
          )}
        </div>
      );
    }

    if (field.type === "yearRange") {
      const fromError = errors[`${field.id}_from`];
      const toError = errors[`${field.id}_to`];
      const currentYear = new Date().getFullYear();
      const startYear = 1900;
      const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => currentYear - i);
      const fromYearValue = watch(`${field.id}_from`);
      const toYearValue = formValues[`${field.id}_to`];
      const hasYearError = fromError || toError;

      return (
        <div key={field.id} className={styles.fieldGroup}>
          <label className={styles.label}>{field.label}:</label>
          <div className={styles.groupInputs}>
            <select
              id={`${field.id}_from`}
              className={`${styles.input} ${fromError ? styles.inputError : ""}`}
              {...register(`${field.id}_from`, {
                required: field.required ? `${field.label} from year is required` : false,
              })}
            >
              <option value="">From year</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span className={styles.groupSeparator}>-</span>
            <select
              id={`${field.id}_to`}
              className={`${styles.input} ${toError ? styles.inputError : ""}`}
              {...register(`${field.id}_to`, {
                required: field.required ? `${field.label} to year is required` : false,
                validate: (value) => {
                  if (!value) return true;
                  if (fromYearValue && Number(value) < Number(fromYearValue)) {
                    return "To year must be greater than or equal to from year";
                  }
                  return true;
                },
              })}
            >
              <option value="">To year</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          {hasYearError ? (
            <span className={styles.errorMessage} role="alert">
              {(fromError?.message || toError?.message) as string}
            </span>
          ) : (
            field.required &&
            (!fromYearValue || !toYearValue) && <span className={styles.requiredText}>This is a required field</span>
          )}
        </div>
      );
    }

    const fieldValue = formValues[field.id];

    switch (field.type) {
      case "num":
        return (
          <div key={field.id} className={styles.fieldGroup}>
            <label htmlFor={field.id} className={styles.label}>
              {field.label}:
            </label>
            <input
              id={field.id}
              type="text"
              placeholder={field.placeholder || "e.g. >=60, [50-80]"}
              className={`${styles.input} ${fieldError ? styles.inputError : ""}`}
              aria-invalid={!!fieldError}
              {...register(field.id, {
                required: field.required ? `${field.label} is required` : false,
                validate: (v) => {
                  if (!v || v === "") return true;
                  const s = String(v).trim();
                  const isRange = /^[[\]]\s*-?\d+(\.\d+)?\s*-\s*-?\d+(\.\d+)?\s*[[\]]$/.test(s);
                  const isOp = /^(>=|<=|>|<|=|!=)\s*-?\d+(\.\d+)?$/.test(s);
                  const isNum = /^-?\d+(\.\d+)?$/.test(s);
                  if (!isRange && !isOp && !isNum) {
                    return `Invalid expression. Examples: >=60, >50, [50-80], 60`;
                  }
                  return true;
                },
              })}
            />
            {fieldError ? (
              <span className={styles.errorMessage} role="alert">
                {fieldError.message as string}
              </span>
            ) : (
              field.required && !fieldValue && <span className={styles.requiredText}>This is a required field</span>
            )}
          </div>
        );

      case "text":
        return (
          <div key={field.id} className={styles.fieldGroup}>
            <label htmlFor={field.id} className={styles.label}>
              {field.label}:
            </label>
            <input
              id={field.id}
              type="text"
              placeholder={field.placeholder}
              className={`${styles.input} ${fieldError ? styles.inputError : ""}`}
              aria-invalid={!!fieldError}
              {...register(field.id, {
                required: field.required ? `${field.label} is required` : false,
              })}
            />
            {fieldError ? (
              <span className={styles.errorMessage} role="alert">
                {fieldError.message as string}
              </span>
            ) : (
              field.required && !fieldValue && <span className={styles.requiredText}>This is a required field</span>
            )}
          </div>
        );

      case "datetime":
      case "time":
        return (
          <div key={field.id} className={styles.fieldGroup}>
            <label htmlFor={field.id} className={styles.label}>
              {field.label}:
            </label>
            <input
              id={field.id}
              type="date"
              aria-label={field.placeholder || field.label}
              className={`${styles.input} ${fieldError ? styles.inputError : ""}`}
              aria-invalid={!!fieldError}
              {...register(field.id, {
                required: field.required ? `${field.label} is required` : false,
              })}
            />
            {fieldError ? (
              <span className={styles.errorMessage} role="alert">
                {fieldError.message as string}
              </span>
            ) : (
              field.required && !fieldValue && <span className={styles.requiredText}>This is a required field</span>
            )}
          </div>
        );

      default:
        return (
          <div key={field.id} className={styles.fieldGroup}>
            <label className={styles.label}>{field.label}:</label>
            <div className={styles.unsupported}>Unsupported field type: {field.type}</div>
          </div>
        );
    }
  };

  if (!selectedWizard) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Error</h2>
        </div>
        <p>Error: No wizard selected. Please return to wizard selection.</p>
      </div>
    );
  }

  // Get submit button text from stepConfig or default to "Next"
  const submitLabel = stepConfig ? (stepConfig.config as FormStepConfig)?.submitLabel || "Next" : "Next";

  const renderFields = (fields: FieldDefinition[]) => {
    return fields.map((field) => renderField(field));
  };

  return (
    <div className={styles.container}>
      <h2>{selectedWizard.name}</h2>

      {selectedWizard.description && <div className={styles.description}>{selectedWizard.description}</div>}

      <div className={styles.note}>
        Note: this is a very rough approximation that is just a starting point for a more comprehensive analysis.
      </div>

      <hr className={styles.divider} />

      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
            e.preventDefault();
          }
        }}
        className={styles.form}
        aria-label={selectedWizard.name + " form"}
      >
        <div className={styles.formFields}>{renderFields(selectedWizard.fields)}</div>

        <div className={styles.buttonRow}>
          <button type="button" onClick={goBack} className={styles.button}>
            Back
          </button>
          <button
            type="submit"
            disabled={!allRequiredFieldsFilled() || !isValid}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            <span>▦</span> {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
