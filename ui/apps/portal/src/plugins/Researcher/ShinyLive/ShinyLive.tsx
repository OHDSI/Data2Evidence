import { InfoOutlined } from "@mui/icons-material";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { FC, useEffect, useMemo, useState } from "react";
import { DashboardIframe } from "../../../components/Dashboard";
import "./ShinyLive.scss";

interface ShinyLiveDashboard {
  name: string;
  language: "python" | "r";
}

const RESULT_VIEWER_KEY = "__result_viewer__";

interface ShinyLiveProps extends PageProps<ResearcherStudyMetadata> {}

export const ShinyLive: FC<ShinyLiveProps> = ({ metadata }: ShinyLiveProps) => {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [dashboardUrl, setDashboardUrl] = useState<string>("");
  const [dashboards, setDashboards] = useState<ShinyLiveDashboard[]>([]);
  // studyId = tokenStudyCode = container name (e.g. "study_1")
  const [studyId, setStudyId] = useState<string | null>(null);
  const [isStrategusStudy, setIsStrategusStudy] = useState<boolean>(false);
  const [viewerRunning, setViewerRunning] = useState<boolean>(false);
  const [selectedDashboard, setSelectedDashboard] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!metadata?.studyId) {
        setError("No dataset selected");
        return;
      }

      try {
        setIsLoading(true);
        const authToken = await metadata.getToken();
        if (!authToken) return;
        setToken(authToken);

        const headers = {
          Authorization: authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`,
        };
        const fetchOpts = { headers, credentials: "include" as RequestCredentials };

        // Parallel: R/Python dashboard list + dataset type/studyCode info
        const [dashboardResp, infoResp] = await Promise.allSettled([
          fetch(
            `${window.location.origin}/d2e/gateway/api/dataset/dashboard/list?datasetId=${metadata.studyId}`,
            fetchOpts
          ),
          fetch(
            `${window.location.origin}/d2e/gateway/api/dataset/info?datasetId=${metadata.studyId}`,
            fetchOpts
          ),
        ]);

        // R/Python dashboards (exclude shiny_server — that's the result viewer)
        if (dashboardResp.status === "fulfilled" && dashboardResp.value.ok) {
          const list = await dashboardResp.value.json();
          setDashboards(
            list
              .filter((d: any) => d.language && d.language !== "shiny_server")
              .map((d: any) => ({ name: d.name, language: d.language }))
          );
        }

        // Dataset info → determine if this is a strategus study and get the container name
        if (infoResp.status === "fulfilled" && infoResp.value.ok) {
          const info = await infoResp.value.json();
          if (info?.type === "strategus_analysis" && info?.tokenStudyCode) {
            setIsStrategusStudy(true);
            setStudyId(info.tokenStudyCode);

            // Check if the R Shiny Server viewer is currently running
            try {
              const statusResp = await fetch(
                `${window.location.origin}/d2e/gateway/api/strategus-results/${info.tokenStudyCode}/status`,
                fetchOpts
              );
              if (statusResp.ok) {
                const status = await statusResp.json();
                setViewerRunning(status.running === true);
              }
            } catch {
              // viewer not running — not an error
            }
          }
        }
      } catch (err) {
        console.error("[ShinyLive] Error fetching data:", err);
        setError("Unable to load dashboards.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [metadata?.studyId, metadata]);

  const options = useMemo(() => {
    const opts: { key: string; label: string; disabled?: boolean }[] = [];

    if (isStrategusStudy) {
      opts.push({
        key: RESULT_VIEWER_KEY,
        label: viewerRunning ? "Result Viewer (R Shiny Server)" : "Result Viewer (R Shiny Server — not running)",
        disabled: !viewerRunning,
      });
    }

    dashboards.forEach((d) => {
      opts.push({
        key: `${d.name}_${d.language}`,
        label: `${d.name} (${d.language.toUpperCase()})`,
      });
    });

    return opts;
  }, [isStrategusStudy, viewerRunning, dashboards]);

  // Auto-select first enabled option
  useEffect(() => {
    if (!selectedDashboard && options.length > 0) {
      const first = options.find((o) => !o.disabled);
      if (first) setSelectedDashboard(first.key);
    }
  }, [options, selectedDashboard]);

  // Build iframe URL when selection changes
  useEffect(() => {
    if (!selectedDashboard || !metadata?.studyId) return;

    if (selectedDashboard === RESULT_VIEWER_KEY && studyId) {
      setDashboardUrl(`${window.location.origin}/d2e/gateway/api/strategus-results/${studyId}/`);
    } else {
      setDashboardUrl(
        `${window.location.origin}/d2e/gateway/api/dataset/shiny-live/${metadata.studyId}_dashboard_${selectedDashboard}/`
      );
    }
  }, [selectedDashboard, studyId, metadata?.studyId]);

  const handleDashboardChange = (event: SelectChangeEvent<string>) => {
    setSelectedDashboard(event.target.value);
  };

  if (error) {
    return (
      <div className="shinylive-plugin">
        <div className="shinylive-plugin__error">
          <InfoOutlined style={{ fontSize: 64, color: "#9e9e9e", marginBottom: "1rem" }} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="shinylive-plugin">
        <div className="shinylive-plugin__loading">Loading available dashboards...</div>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="shinylive-plugin">
        <div className="shinylive-plugin__empty">
          <p>No dashboards available for this dataset</p>
        </div>
      </div>
    );
  }

  const showIframe = token && dashboardUrl && selectedDashboard && selectedDashboard !== RESULT_VIEWER_KEY;
  const showResultViewer =
    selectedDashboard === RESULT_VIEWER_KEY && studyId && viewerRunning && dashboardUrl;

  return (
    <div className="shinylive-plugin">
      <div className="shinylive-plugin__selector">
        <FormControl fullWidth size="small">
          <InputLabel id="dashboard-select-label">Select Dashboard</InputLabel>
          <Select
            labelId="dashboard-select-label"
            id="dashboard-select"
            value={selectedDashboard}
            label="Select Dashboard"
            onChange={handleDashboardChange}
          >
            {options.map((opt) => (
              <MenuItem key={opt.key} value={opt.key} disabled={opt.disabled}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      {showResultViewer || showIframe ? (
        <DashboardIframe
          url={dashboardUrl}
          token={token}
          title={`Dashboard - ${selectedDashboard}`}
          loadingMessage="Loading Dashboard..."
        />
      ) : selectedDashboard && !showResultViewer && !showIframe ? (
        <div className="shinylive-plugin__empty">
          <p>
            {selectedDashboard === RESULT_VIEWER_KEY
              ? "The result viewer is not running. Start it from the admin portal."
              : "No dashboard available for this selection."}
          </p>
        </div>
      ) : (
        <div className="shinylive-plugin__loading">Loading...</div>
      )}
    </div>
  );
};
