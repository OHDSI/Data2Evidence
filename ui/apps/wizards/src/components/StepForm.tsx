import { useForm } from "react-hook-form";
import { useWizardContext } from "../context/WizardContext";
import type { FieldDefinition, FormStepConfig } from "../types/wizard";
import styles from "./StepForm.module.css";

export function StepForm() {
  const { selectedWizard, formData, updateFormData, goBack, goForward, getCurrentStepConfig } = useWizardContext();
  const stepConfig = getCurrentStepConfig();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    mode: "onChange",
    defaultValues: formData,
  });

  const onSubmit = (data: Record<string, any>) => {
    updateFormData(data);
    goForward();
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
