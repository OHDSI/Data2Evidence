import { useForm, Controller } from "react-hook-form";
import { useWizardContext } from "../context/WizardContext";
import type { FieldDefinition, FormStepConfig } from "../types/wizard";
import { generateFormSubmitDeepLink } from "../utils/deepLinks";
import styles from "./StepForm.module.css";

/**
 * Form step renderer with config-driven fields.
 */
export function StepForm() {
  const { selectedWizard, formData, updateFormData, goBack, goForward, getCurrentStepConfig, portalProps } =
    useWizardContext();
  const stepConfig = getCurrentStepConfig();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm({
    mode: "onChange",
    defaultValues: formData,
  });

  const onSubmit = (data: Record<string, any>) => {
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

        const deepLinkUrl = generateFormSubmitDeepLink(selectedWizard.id, combinedFormData, portalProps.datasetId);

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

    switch (field.type) {
      case "number":
        return (
          <div key={field.id} className={styles.fieldGroup}>
            <label htmlFor={field.id} className={styles.label}>
              {field.label}
              {field.required && <span className={styles.required}> *</span>}
            </label>
            <input
              id={field.id}
              type="number"
              className={`${styles.input} ${fieldError ? styles.inputError : ""}`}
              {...register(field.id, {
                required: field.required ? `${field.label} is required` : false,
                valueAsNumber: true,
                min:
                  field.validation?.min !== undefined
                    ? {
                        value: field.validation.min,
                        message: `Minimum value is ${field.validation.min}`,
                      }
                    : undefined,
                max:
                  field.validation?.max !== undefined
                    ? {
                        value: field.validation.max,
                        message: `Maximum value is ${field.validation.max}`,
                      }
                    : undefined,
              })}
            />
            {fieldError && <span className={styles.errorMessage}>{fieldError.message as string}</span>}
          </div>
        );

      case "text":
        return (
          <div key={field.id} className={styles.fieldGroup}>
            <label htmlFor={field.id} className={styles.label}>
              {field.label}
              {field.required && <span className={styles.required}> *</span>}
            </label>
            <input
              id={field.id}
              type="text"
              className={`${styles.input} ${fieldError ? styles.inputError : ""}`}
              {...register(field.id, {
                required: field.required ? `${field.label} is required` : false,
              })}
            />
            {fieldError && <span className={styles.errorMessage}>{fieldError.message as string}</span>}
          </div>
        );

      case "select":
        // Validate that options exist and are not empty
        if (!field.options || field.options.length === 0) {
          return (
            <div key={field.id} className={styles.fieldGroup}>
              <label htmlFor={field.id} className={styles.label}>
                {field.label}
                {field.required && <span className={styles.required}> *</span>}
              </label>
              <div className={styles.errorMessage}>Error: No options available for {field.label}</div>
            </div>
          );
        }

        return (
          <div key={field.id} className={styles.fieldGroup}>
            <label htmlFor={field.id} className={styles.label}>
              {field.label}
              {field.required && <span className={styles.required}> *</span>}
            </label>
            <Controller
              name={field.id}
              control={control}
              defaultValue={formData[field.id] ?? ""}
              rules={{
                required: field.required ? `${field.label} is required` : false,
              }}
              render={({ field: controllerField }) => (
                <select
                  {...controllerField}
                  id={field.id}
                  className={`${styles.input} ${fieldError ? styles.inputError : ""}`}
                >
                  {!field.required && <option value="">Select {field.label}</option>}
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            />
            {fieldError && <span className={styles.errorMessage}>{fieldError.message as string}</span>}
          </div>
        );

      default:
        return (
          <div key={field.id} className={styles.fieldGroup}>
            <label className={styles.label}>{field.label}</label>
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{stepConfig?.title || selectedWizard.name}</h2>
      </div>

      {selectedWizard.description && <div className={styles.description}>{selectedWizard.description}</div>}

      {stepConfig?.note && <div className={styles.note}>{stepConfig.note}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.formFields}>{selectedWizard.fields.map((field) => renderField(field))}</div>

        <div className={styles.buttonRow}>
          <button type="button" onClick={goBack} className={styles.button}>
            Back
          </button>
          <button type="submit" disabled={!isValid} className={`${styles.button} ${styles.buttonPrimary}`}>
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
