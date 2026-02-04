import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { FC, useEffect, useState } from "react";
import { DashboardIframe } from "../../../components/Dashboard";
import "./ShinyLive.scss";

interface ShinyLiveProps extends PageProps<ResearcherStudyMetadata> {}

export const ShinyLive: FC<ShinyLiveProps> = ({ metadata }: ShinyLiveProps) => {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [dashboardUrl, setDashboardUrl] = useState<string>("");

  useEffect(() => {
    const fetchToken = async () => {
      if (!metadata?.studyId) {
        console.log("[ShinyLive] No dataset selected");
        setError("No dataset selected");
        return;
      }

      try {
        const authToken = await metadata.getToken();
        if (authToken) {
          setToken(authToken);
          const url = `${window.location.origin}/d2e/gateway/api/dataset/shiny-live/${metadata.studyId}_dashboard_testing_r/`;
          setDashboardUrl(url);
        }
      } catch (error) {
        console.error("[ShinyLive] Error fetching auth token:", error);
        setError("Failed to authenticate");
      }
    };

    fetchToken();
  }, [metadata?.studyId, metadata]);

  return (
    <div className="shinylive-plugin">
      {error ? (
        <div className="shinylive-plugin__error">
          <p>{error}</p>
        </div>
      ) : token && dashboardUrl ? (
        <DashboardIframe
          url={dashboardUrl}
          token={token}
          title="ShinyLive Dashboard"
          loadingMessage="Loading ShinyLive Dashboard..."
        />
      ) : (
        <div className="shinylive-plugin__loading">Loading...</div>
      )}
    </div>
  );
};
