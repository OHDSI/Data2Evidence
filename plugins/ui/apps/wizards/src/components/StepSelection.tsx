import { useCallback, useState, useEffect } from "react";
import { getWizardDefinitions, isWizardVisibleOnSurface } from "../config/wizardDefinitions";
import { useWizardContext } from "../context/WizardContext";
import type { WizardDefinition } from "../types/wizard";
import { listAtlasSources, publishAtlasSourceSelection, resolveAtlasSourceKey } from "../api/atlasSourceApi";
import type { AtlasSource } from "../api/atlasSourceApi";
import styles from "./StepSelection.module.css";

/**
 * Wizard selection grid.
 */
export function StepSelection() {
  const { selectWizard, portalProps } = useWizardContext();
  const [wizards, setWizards] = useState<WizardDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<AtlasSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(portalProps.isAtlas === true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  const selectSource = useCallback(
    (sourceKey: string) => {
      if (!sourceKey || sourceKey === portalProps.datasetId) return;
      publishAtlasSourceSelection(portalProps.appId, sourceKey);
    },
    [portalProps.appId, portalProps.datasetId],
  );

  useEffect(() => {
    if (portalProps.isAtlas !== true) return;

    let active = true;
    setSourcesLoading(true);
    setSourcesError(null);

    listAtlasSources(portalProps.getToken)
      .then((availableSources) => {
        if (!active) return;
        setSources(availableSources);
      })
      .catch((sourceError) => {
        if (!active) return;
        console.error("[Wizards] Failed to load Atlas data sources:", sourceError);
        setSourcesError("Unable to load data sources");
      })
      .finally(() => {
        if (active) setSourcesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [portalProps.getToken, portalProps.isAtlas]);

  useEffect(() => {
    if (portalProps.isAtlas !== true || sourcesLoading) return;

    const sourceKey = resolveAtlasSourceKey(sources, portalProps.datasetId);
    if (sourceKey && sourceKey !== portalProps.datasetId) {
      selectSource(sourceKey);
    }
  }, [portalProps.datasetId, portalProps.isAtlas, selectSource, sources, sourcesLoading]);

  const loadWizards = async () => {
    if (portalProps.isAtlas === true && !portalProps.datasetId) {
      setLoading(false);
      setWizards([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const definitions = await getWizardDefinitions(portalProps.datasetId);
      setWizards(definitions.filter((wizard) => isWizardVisibleOnSurface(wizard, "wizardApp")));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load wizards";
      console.error("[Wizards] Failed to load wizard definitions:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWizards();
  }, [portalProps.datasetId]);

  const handleWizardSelect = async (wizardId: string) => {
    try {
      await selectWizard(wizardId);
    } catch {
      setError("Failed to load wizard. Please try again.");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, wizardId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleWizardSelect(wizardId);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.grid}>
          <div className={styles.loading} role="status">
            Loading wizards...
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <>
          <div className={styles.error} role="alert">
            Error: {error}
          </div>
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <button onClick={loadWizards} className={styles.retryButton}>
              Retry
            </button>
          </div>
        </>
      );
    }

    if (wizards.length === 0) {
      if (portalProps.isAtlas === true && !portalProps.datasetId) {
        return <div className={styles.empty}>Select a data source to view wizards</div>;
      }
      return <div className={styles.empty}>No wizards available</div>;
    }

    return (
      <div className={styles.grid}>
        {wizards.map((wizard) => (
          <div
            key={wizard.id}
            className={styles.card}
            onClick={() => handleWizardSelect(wizard.id)}
            onKeyDown={(e) => handleKeyDown(e, wizard.id)}
            role="button"
            tabIndex={0}
            aria-label={`Select ${wizard.name} wizard`}
          >
            <h3 className={styles.cardTitle}>{wizard.name}</h3>
            <p className={styles.cardDescription}>{wizard.description}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Getting started</h2>
        <p className={styles.subtitle}>We've built some pre-configured scenarios to get you started</p>
      </div>
      {portalProps.isAtlas === true ? (
        <div className={styles.sourceToolbar}>
          <label className={styles.sourceSelector}>
            <span className={styles.sourceLabel}>Data source</span>
            <svg className={styles.sourceIcon} viewBox="0 0 24 24" aria-hidden="true">
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v5c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
              <path d="M4 10v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
              <path d="M4 15v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4" />
            </svg>
            <select
              className={styles.sourceControl}
              value={portalProps.datasetId || ""}
              disabled={sourcesLoading || sources.length === 0}
              onChange={(event) => selectSource(event.target.value)}
              aria-label="Data source"
            >
              <option value="" disabled>
                {sourcesLoading
                  ? "Loading data sources..."
                  : sources.length > 0
                    ? "Select a data source"
                    : "No data sources available"}
              </option>
              {sources.map((source) => (
                <option key={source.sourceKey} value={source.sourceKey}>
                  {source.sourceName}
                </option>
              ))}
            </select>
          </label>
          {sourcesError ? <span className={styles.sourceError}>{sourcesError}</span> : null}
        </div>
      ) : null}
      {renderContent()}
    </div>
  );
}
