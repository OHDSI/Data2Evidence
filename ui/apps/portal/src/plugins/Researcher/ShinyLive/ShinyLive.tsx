import { InfoOutlined } from "@mui/icons-material";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { FC, useEffect, useMemo, useState } from "react";
import { DashboardIframe } from "../../../components/Dashboard";
import { useTranslation } from "../../../contexts";
import "./ShinyLive.scss";

interface ShinyLiveDashboard {
  name: string;
  language: "python" | "r";
}

const RESULT_VIEWER_KEY = "__result_viewer__";

interface ShinyLiveProps extends PageProps<ResearcherStudyMetadata> {}

export const ShinyLive: FC<ShinyLiveProps> = ({ metadata }: ShinyLiveProps) => {
  const { getText, i18nKeys } = useTranslation();
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [dashboardUrl, setDashboardUrl] = useState<string>("");
  const [dashboards, setDashboards] = useState<ShinyLiveDashboard[]>([]);
  const [studyId, setStudyId] = useState<string | null>(null);
  const [isStrategusStudy, setIsStrategusStudy] = useState<boolean>(false);
  const [viewerRunning, setViewerRunning] = useState<boolean>(false);
  const [viewerUnauthorized, setViewerUnauthorized] = useState<boolean>(false);
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

        // Fetch both study dashboard and strategus viewer
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

        if (dashboardResp.status === "fulfilled" && dashboardResp.value.ok) {
          const list = await dashboardResp.value.json();
          setDashboards(
            list
              .filter((d: any) => d.language && d.language !== "shiny_server")
              .map((d: any) => ({ name: d.name, language: d.language }))
          );
        }

        if (infoResp.status === "fulfilled" && infoResp.value.ok) {
          const info = await infoResp.value.json();
          if (info?.type === "strategus_analysis" && info?.tokenStudyCode) {
            setIsStrategusStudy(true);
            setStudyId(info.tokenStudyCode);

            // Check if the R Shiny Server viewer is currently running
            try {
              const statusResp = await fetch(
                `${window.location.origin}/strategus-results/${info.tokenStudyCode}/status`,
                fetchOpts
              );
              if (statusResp.ok) {
                const status = await statusResp.json();
                setViewerRunning(status.running === true);
                setViewerUnauthorized(false);
              } else if (statusResp.status === 401) {
                setViewerRunning(false);
                setViewerUnauthorized(true);
              } else {
                setViewerRunning(false);
                setViewerUnauthorized(false);
              }
            } catch (err) {
              console.error("[ShinyLive] Error checking viewer status:", err);
              setViewerRunning(false);
              setViewerUnauthorized(false);
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

    if (isStrategusStudy && !viewerUnauthorized) {
      let label = "Result Viewer (R Shiny Server)";
      if (!viewerRunning) {
        label = "Result Viewer (R Shiny Server — not running)";
      }
      
      opts.push({
        key: RESULT_VIEWER_KEY,
        label,
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
  }, [isStrategusStudy, viewerRunning, viewerUnauthorized, dashboards]);

  // Auto-select first enabled option
  useEffect(() => {
    if (!selectedDashboard && options.length > 0) {
      const first = options.find((o) => !o.disabled);
      if (first) setSelectedDashboard(first.key);
    }
  }, [options, selectedDashboard]);

  useEffect(() => {
    if (!selectedDashboard || !metadata?.studyId) return;

    if (selectedDashboard === RESULT_VIEWER_KEY && studyId) {
      if (token) {
        try {
          document.cookie = `authtoken=${token}; path=/strategus-results; secure; SameSite=Strict;`;
          console.log("[ShinyLive] Set authtoken cookie for strategus-results");
        } catch (err) {
          console.error("[ShinyLive] Error setting cookie:", err);
        }
      }
      setDashboardUrl(`${window.location.origin}/strategus-results/${studyId}/`);
    } else {
      setDashboardUrl(
        `${window.location.origin}/d2e/gateway/api/dataset/shiny-live/${metadata.studyId}_dashboard_${selectedDashboard}/`
      );
    }
  }, [selectedDashboard, studyId, metadata?.studyId, token]);

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

  if (viewerUnauthorized && dashboards.length === 0) {
    return (
      <div className="shinylive-plugin">
        <div className="shinylive-plugin__error">
          <InfoOutlined style={{ fontSize: 64, color: "#9e9e9e", marginBottom: "1rem" }} />
          <p>{getText(i18nKeys.UI_PLUGIN_SHINY_LIVE__UNAUTHORIZED)}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="shinylive-plugin">
        <div className="shinylive-plugin__loading">{getText(i18nKeys.UI_PLUGIN_SHINY_LIVE__LOADING)}</div>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="shinylive-plugin">
        <div className="shinylive-plugin__empty">
          <p>{getText(i18nKeys.UI_PLUGIN_SHINY_LIVE__NO_DASHBOARDS)}</p>
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
          <InputLabel id="dashboard-select-label">{getText(i18nKeys.UI_PLUGIN_SHINY_LIVE__SELECT_DASHBOARD)}</InputLabel>
          <Select
            labelId="dashboard-select-label"
            id="dashboard-select"
            value={selectedDashboard}
            label={getText(i18nKeys.UI_PLUGIN_SHINY_LIVE__SELECT_DASHBOARD)}
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
              ? viewerUnauthorized
                ? getText(i18nKeys.UI_PLUGIN_SHINY_LIVE__UNAUTHORIZED)
                : getText(i18nKeys.UI_PLUGIN_SHINY_LIVE__VIEWER_NOT_RUNNING)
              : getText(i18nKeys.UI_PLUGIN_SHINY_LIVE__NO_DASHBOARD_FOR_SELECTION)}
          </p>
        </div>
      ) : (
        <div className="shinylive-plugin__loading">{getText(i18nKeys.UI_PLUGIN_SHINY_LIVE__LOADING_DOTS)}</div>
      )}
    </div>
  );
};
