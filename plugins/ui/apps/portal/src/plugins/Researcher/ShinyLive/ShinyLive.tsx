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

interface ShinyLiveProps extends PageProps<ResearcherStudyMetadata> {}

export const ShinyLive: FC<ShinyLiveProps> = ({ metadata }: ShinyLiveProps) => {
  const { getText, i18nKeys } = useTranslation();
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [dashboardUrl, setDashboardUrl] = useState<string>("");
  const [dashboards, setDashboards] = useState<ShinyLiveDashboard[]>([]);
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

        const dashboardResp = await fetch(
          `/d2e/gateway/api/dataset/dashboard/list?datasetId=${metadata.studyId}`,
          fetchOpts
        );

        if (dashboardResp.ok) {
          const list = await dashboardResp.json();
          setDashboards(
            list
              .filter((d: any) => d.language && d.language !== "shiny_server")
              .map((d: any) => ({ name: d.name, language: d.language }))
          );
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

    dashboards.forEach((d) => {
      opts.push({
        key: `${d.name}_${d.language}`,
        label: `${d.name} (${d.language.toUpperCase()})`,
      });
    });

    return opts;
  }, [dashboards]);

  // Auto-select first enabled option
  useEffect(() => {
    if (!selectedDashboard && options.length > 0) {
      const first = options.find((o) => !o.disabled);
      if (first) setSelectedDashboard(first.key);
    }
  }, [options, selectedDashboard]);

  useEffect(() => {
    if (!selectedDashboard || !metadata?.studyId) return;

    setDashboardUrl(
      `/d2e/gateway/api/dataset/shiny-live/${metadata.studyId}_dashboard_${selectedDashboard}/`
    );
  }, [selectedDashboard, metadata?.studyId]);

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

  const showIframe = token && dashboardUrl && selectedDashboard;

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

      {showIframe ? (
        <DashboardIframe
          url={dashboardUrl}
          token={token}
          title={`Dashboard - ${selectedDashboard}`}
          loadingMessage="Loading dashboard..."
        />
      ) : selectedDashboard && !showIframe ? (
        <div className="shinylive-plugin__empty">
          <p>{getText(i18nKeys.UI_PLUGIN_SHINY_LIVE__NO_DASHBOARD_FOR_SELECTION)}</p>
        </div>
      ) : (
        <div className="shinylive-plugin__loading">{getText(i18nKeys.UI_PLUGIN_SHINY_LIVE__LOADING_DOTS)}</div>
      )}
    </div>
  );
};
