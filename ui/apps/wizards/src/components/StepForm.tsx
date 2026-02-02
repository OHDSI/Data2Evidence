import { Fragment, useState, useEffect } from "react";
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

  useEffect(() => {
    fetchCdwConfig(portalProps.datasetId).then(({ meta }) => setConfigMeta(meta));
  }, [portalProps.datasetId]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm({
    mode: "onChange",
    defaultValues: formData,
  });

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

        const deepLinkUrl = generateFormSubmitDeepLink(
          selectedWizard.fields,
          combinedFormData,
          configMeta,
          portalProps.datasetId,
          cdwConfig.chartOptions,
          cdwConfig,
          selectedWizard.wizardFields,
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
      return (
        <div key={field.id} className={styles.fieldGroup}>
          <label htmlFor={field.id} className={styles.label}>
            {field.label}:
          </label>
          <TypeaheadField
            fieldId={field.id}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            configPath={field.configPath}
            configMeta={configMeta}
            datasetId={portalProps.datasetId}
            control={control}
            defaultValue={formData[field.id] ?? ""}
            error={fieldError as { message?: string } | undefined}
          />
          {field.required && <span className={styles.requiredText}>This is a required field</span>}
          {fieldError && (
            <span className={styles.errorMessage} role="alert">
              {fieldError.message as string}
            </span>
          )}
        </div>
      );
    }

    if (field.type === "yearRange") {
      const fromError = errors[`${field.id}_from`];
      const toError = errors[`${field.id}_to`];
      return (
        <div key={field.id} className={styles.fieldGroup}>
          <label className={styles.label}>{field.label}:</label>
          <div className={styles.groupInputs}>
            <input
              id={`${field.id}_from`}
              type="date"
              className={`${styles.input} ${fromError ? styles.inputError : ""}`}
              {...register(`${field.id}_from`, {
                required: field.required ? `${field.label} from date is required` : false,
              })}
            />
            <span className={styles.groupSeparator}>-</span>
            <input
              id={`${field.id}_to`}
              type="date"
              className={`${styles.input} ${toError ? styles.inputError : ""}`}
              {...register(`${field.id}_to`, {
                required: field.required ? `${field.label} to date is required` : false,
              })}
            />
          </div>
          {(fromError || toError) && (
            <span className={styles.errorMessage} role="alert">
              {(fromError?.message || toError?.message) as string}
            </span>
          )}
        </div>
      );
    }

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
            {field.required && <span className={styles.requiredText}>This is a required field</span>}
            {fieldError && (
              <span className={styles.errorMessage} role="alert">
                {fieldError.message as string}
              </span>
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
            {field.required && <span className={styles.requiredText}>This is a required field</span>}
            {fieldError && (
              <span className={styles.errorMessage} role="alert">
                {fieldError.message as string}
              </span>
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
            {field.required && <span className={styles.requiredText}>This is a required field</span>}
            {fieldError && (
              <span className={styles.errorMessage} role="alert">
                {fieldError.message as string}
              </span>
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

  // Group fields by the 'group' property
  const renderFields = () => {
    const fields = selectedWizard.fields;
    const renderedFields: JSX.Element[] = [];
    const processedIndices = new Set<number>();

    fields.forEach((field, index) => {
      // Skip if already processed as part of a group
      if (processedIndices.has(index)) return;

      // Check if this field is part of a group
      if (field.group) {
        // Find all adjacent fields with the same group
        const groupFields = [field];
        let nextIndex = index + 1;

        while (nextIndex < fields.length && fields[nextIndex].group === field.group) {
          groupFields.push(fields[nextIndex]);
          processedIndices.add(nextIndex);
          nextIndex++;
        }

        // Render grouped fields in one row
        renderedFields.push(
          <div key={`group-${field.group}-${index}`} className={styles.fieldGroupRow}>
            <label className={styles.label}>{field.group.charAt(0).toUpperCase() + field.group.slice(1)}:</label>
            <div className={styles.groupInputs}>
              {groupFields.map((gField, gIndex) => {
                const fieldError = errors[gField.id];
                return (
                  <Fragment key={gField.id}>
                    {gIndex > 0 && <span className={styles.groupSeparator}>-</span>}
                    <input
                      id={gField.id}
                      type={gField.type}
                      placeholder={gField.placeholder}
                      className={`${styles.input} ${fieldError ? styles.inputError : ""}`}
                      aria-invalid={!!fieldError}
                      {...register(gField.id, {
                        required: gField.required ? `${gField.label} is required` : false,
                      })}
                    />
                  </Fragment>
                );
              })}
            </div>
            {groupFields.map((gField) => {
              const fieldError = errors[gField.id];
              return fieldError ? (
                <span key={`error-${gField.id}`} className={styles.errorMessage} role="alert">
                  {fieldError.message as string}
                </span>
              ) : null;
            })}
          </div>,
        );

        processedIndices.add(index);
      } else {
        // Render individual field normally
        renderedFields.push(renderField(field));
      }
    });

    return renderedFields;
  };

  return (
    <div className={styles.container}>
      <h2>{stepConfig?.title || selectedWizard.name}</h2>

      {selectedWizard.description && <div className={styles.description}>{selectedWizard.description}</div>}

      {stepConfig?.note && <div className={styles.note}>{stepConfig.note}</div>}

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
        <div className={styles.formFields}>{renderFields()}</div>

        {selectedWizard.wizardFields && selectedWizard.wizardFields.length > 0 && (
          <div className={styles.formFields}>{selectedWizard.wizardFields.map((field) => renderField(field))}</div>
        )}

        <div className={styles.buttonRow}>
          <button type="button" onClick={goBack} className={styles.button}>
            Back
          </button>
          <button type="submit" disabled={!isValid} className={`${styles.button} ${styles.buttonPrimary}`}>
            <span>▦</span> {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
