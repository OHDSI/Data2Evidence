import { InfoOutlined } from "@mui/icons-material";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { FC, useEffect, useState } from "react";
import { DashboardIframe } from "../../../components/Dashboard";
import "./ShinyLive.scss";

interface Dashboard {
  name: string;
  language: "python" | "r";
}

interface ShinyLiveProps extends PageProps<ResearcherStudyMetadata> {}

export const ShinyLive: FC<ShinyLiveProps> = ({ metadata }: ShinyLiveProps) => {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [dashboardUrl, setDashboardUrl] = useState<string>("");
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>("");
  const [isLoadingDashboards, setIsLoadingDashboards] = useState<boolean>(false);

  useEffect(() => {
    const fetchTokenAndDashboards = async () => {
      if (!metadata?.studyId) {
        console.log("[ShinyLive] No dataset selected");
        setError("No dataset selected");
        return;
      }

      try {
        const authToken = await metadata.getToken();
        if (authToken) {
          setToken(authToken);

          // Fetch available dashboards
          setIsLoadingDashboards(true);
          const response = await fetch(
            `${window.location.origin}/d2e/gateway/api/dataset/dashboard/list?datasetId=${metadata.studyId}`,
            {
              headers: {
                Authorization: authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`,
              },
              credentials: "include",
            }
          );

          if (response.ok) {
            const dashboardList = await response.json();
            const parsedDashboards: Dashboard[] = dashboardList
              .filter((item: any) => item.language) // Only include dashboards with language
              .map((item: any) => ({
                name: item.name,
                language: item.language,
              }));
            setDashboards(parsedDashboards);

            // Auto-select first dashboard if available
            if (parsedDashboards.length > 0) {
              const firstDashboard = parsedDashboards[0];
              setSelectedDashboard(`${firstDashboard.name}_${firstDashboard.language}`);
            }
          } else {
            console.error("[ShinyLive] Failed to fetch dashboards:", response.status);
            setError("Unable to load dashboards.");
          }
        }
      } catch (error) {
        console.error("[ShinyLive] Error fetching auth token or dashboards:", error);
        setError("Unable to load dashboards.");
      } finally {
        setIsLoadingDashboards(false);
      }
    };

    fetchTokenAndDashboards();
  }, [metadata?.studyId, metadata]);

  // Update dashboard URL when selection changes
  useEffect(() => {
    if (selectedDashboard && metadata?.studyId) {
      const url = `${window.location.origin}/d2e/gateway/api/dataset/shiny-live/${metadata.studyId}_dashboard_${selectedDashboard}/`;
      console.log("[ShinyLive] Setting dashboard URL:", url);
      setDashboardUrl(url);
    }
  }, [selectedDashboard, metadata?.studyId]);

  const handleDashboardChange = (event: SelectChangeEvent<string>) => {
    setSelectedDashboard(event.target.value);
  };

  return (
    <div className="shinylive-plugin">
      {error ? (
        <div className="shinylive-plugin__error">
          <InfoOutlined style={{ fontSize: 64, color: "#9e9e9e", marginBottom: "1rem" }} />
          <p>{error}</p>
        </div>
      ) : isLoadingDashboards ? (
        <div className="shinylive-plugin__loading">Loading available dashboards...</div>
      ) : dashboards.length === 0 ? (
        <div className="shinylive-plugin__empty">
          <p>No dashboards available for this dataset</p>
        </div>
      ) : (
        <>
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
                {dashboards.map((dashboard) => (
                  <MenuItem
                    key={`${dashboard.name}_${dashboard.language}`}
                    value={`${dashboard.name}_${dashboard.language}`}
                  >
                    {dashboard.name} ({dashboard.language?.toUpperCase() || "UNKNOWN"})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {token && dashboardUrl && selectedDashboard ? (
            <DashboardIframe
              url={dashboardUrl}
              token={token}
              title={`ShinyLive Dashboard - ${selectedDashboard}`}
              loadingMessage="Loading ShinyLive Dashboard..."
            />
          ) : (
            <div className="shinylive-plugin__loading">Loading...</div>
          )}
        </>
      )}
    </div>
  );
};
