import { InfoOutlined } from "@mui/icons-material";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { FC, useEffect, useState } from "react";
import { DashboardIframe } from "../../../components/Dashboard";
import "./ShinyLive.scss";

interface Dashboard {
  name: string;
  type: string;
  language: "python" | "r" | "shiny-server";
}

interface ShinyLiveProps extends PageProps<ResearcherStudyMetadata> {}

export const ShinyLive: FC<ShinyLiveProps> = ({ metadata }: ShinyLiveProps) => {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [dashboardUrl, setDashboardUrl] = useState<string>("");
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>("");
  const [isLoadingDashboards, setIsLoadingDashboards] = useState<boolean>(false);
  const [isShinyServer, setIsShinyServer] = useState<boolean>(false);

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
                type: item.type,
                language: item.language,
              }));
            setDashboards(parsedDashboards);

            // Auto-select first dashboard if available
            if (parsedDashboards.length > 0) {
              const firstDashboard = parsedDashboards[0];
              setSelectedDashboard(`${firstDashboard.name}_${firstDashboard.type}_${firstDashboard.language}`);
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

  // Handle token refresh for Shiny Server dashboards
  useEffect(() => {
    if (!isShinyServer || !token) return;

    // Set initial cookie
    try {
      document.cookie = `authtoken=${token}; path=/strategus-results; secure; SameSite=Strict;`;
      console.log("[ShinyLive] Set authtoken cookie for Shiny Server");
    } catch (err) {
      console.error("[ShinyLive] Error setting cookie:", err);
    }

    // Listen for token refresh events
    const onTokenRefreshed = (e: Event) => {
      const refreshedToken = (e as CustomEvent)?.detail?.accessToken as string | undefined;
      if (!refreshedToken) return;

      console.log("[ShinyLive] Token refreshed via OIDC event, updating cookie");
      setToken(refreshedToken);
      
      // Update cookie
      try {
        document.cookie = `authtoken=${refreshedToken}; path=/strategus-results; secure; SameSite=Strict;`;
      } catch (err) {
        console.error("[ShinyLive] Error updating cookie after OIDC refresh:", err);
      }
    };

    window.addEventListener("oidc:token_refreshed", onTokenRefreshed as EventListener);
    return () => window.removeEventListener("oidc:token_refreshed", onTokenRefreshed as EventListener);
  }, [isShinyServer, token]);

  // Update dashboard URL when selection changes
  useEffect(() => {
    if (selectedDashboard && metadata?.studyId) {
      // Parse the selected dashboard: name_type_language
      const parts = selectedDashboard.split('_');
      const language = parts.pop(); // Last part is language
      const type = parts.pop(); // Second to last is type
      const name = parts.join('_'); // Rest is the name (could contain underscores)
      
      let url: string;
      
      // Check if this is a Shiny Server dashboard (language === "shiny-server")
      const isShinyServerDashboard = language === "shiny-server";
      setIsShinyServer(isShinyServerDashboard);
      
      if (isShinyServerDashboard) {
        // Shiny Server: proxy to strategus-results
        // Use container ID pattern: {studyId}_{dashboardName}
        // No validation middleware on backend, so this will work
        url = `/strategus-results/${metadata.studyId}_${name}`;
      } else {
        // ShinyLive: serve static files
        url = `${window.location.origin}/d2e/gateway/api/dataset/shiny-live/${metadata.studyId}_dashboard_${name}_${language}/`;
      }
      
      console.log("[ShinyLive] Setting dashboard URL:", url, { name, type, language, isShinyServer: isShinyServerDashboard });
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
                {dashboards.map((dashboard) => {
                  const dashboardKey = `${dashboard.name}_${dashboard.type}_${dashboard.language}`;
                  // Display type based on language field: "shiny-server" means Shiny Server, otherwise ShinyLive
                  const displayType = dashboard.language === "shiny-server" ? "Shiny Server (R)" : `ShinyLive (${dashboard.language?.toUpperCase()})`;
                  return (
                    <MenuItem
                      key={dashboardKey}
                      value={dashboardKey}
                    >
                      {dashboard.name} - {displayType}
                    </MenuItem>
                  );
                })}
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
