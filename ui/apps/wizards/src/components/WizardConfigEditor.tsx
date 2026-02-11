import { useState, useEffect } from "react";
import client from "../axios/request";
import styles from "./WizardConfigEditor.module.css";

interface WizardConfigEditorProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId?: string;
}

export function WizardConfigEditor({ isOpen, onClose, datasetId }: WizardConfigEditorProps) {
  const [configJson, setConfigJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.get("/d2e/pa-config-svc/wizards/config", {
        params: { datasetId },
      });
      setConfigJson(JSON.stringify(response.data, null, 2));
    } catch (err: any) {
      setError(err.message || "Failed to fetch config");
      setConfigJson('{\n  "wizards": []\n}');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    try {
      JSON.parse(configJson);
    } catch {
      setError("Invalid JSON format");
      return;
    }

    setSaving(true);
    try {
      await client.put("/d2e/pa-config-svc/wizards/config", JSON.parse(configJson), {
        params: { datasetId },
      });
      setSuccess("Config saved successfully");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Wizard Config Editor</h2>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : (
            <textarea
              className={styles.editor}
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              spellCheck={false}
            />
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.footer}>
          <button className={styles.button} onClick={fetchConfig} disabled={loading}>
            Reload
          </button>
          <button
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
