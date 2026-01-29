import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { getWizardById } from "../config/wizardDefinitions";
import { useWizardContext } from "../context/WizardContext";
import type { WizardDefinition, FieldDefinition } from "../types/wizard";
import styles from "./Step3Form.module.css";

export function Step3Form() {
  const { selectedWizardId, formData, updateFormData, goBack, goForward } = useWizardContext();
  const [wizard, setWizard] = useState<WizardDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    mode: "onBlur",
    defaultValues: formData,
  });

  useEffect(() => {
    async function loadWizard() {
      if (!selectedWizardId) {
        setError("No wizard selected");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const definition = await getWizardById(selectedWizardId);
        if (!definition) {
          setError("Wizard not found");
        } else {
          setWizard(definition);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load wizard");
      } finally {
        setLoading(false);
      }
    }

    loadWizard();
  }, [selectedWizardId]);

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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Form Entry</h2>
          <p className={styles.progress}>Step 3 of 4</p>
        </div>
        <div className={styles.loading}>Loading wizard...</div>
      </div>
    );
  }

  if (error || !wizard) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Form Entry</h2>
          <p className={styles.progress}>Step 3 of 4</p>
        </div>
        <div className={styles.error}>Error: {error || "Wizard not found"}</div>
        <div className={styles.buttonRow}>
          <button type="button" onClick={goBack} className={styles.button}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{wizard.name}</h2>
        <p className={styles.progress}>Step 3 of 4</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.formFields}>{wizard.fields.map((field) => renderField(field))}</div>

        <div className={styles.buttonRow}>
          <button type="button" onClick={goBack} className={styles.button}>
            Back
          </button>
          <button type="submit" disabled={!isValid} className={`${styles.button} ${styles.buttonPrimary}`}>
            Next
          </button>
        </div>
      </form>
    </div>
  );
}
