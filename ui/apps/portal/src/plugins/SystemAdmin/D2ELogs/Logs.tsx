import React, { FC } from "react";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import { getAuthToken } from "../../../containers/auth";
import "./Logs.scss";

const LOGS_URL = "/dockerlogs";
interface LogsPageProps extends PageProps<SystemAdminPageMetadata> {}

export const Logs: FC<LogsPageProps> = () => {

  // modify fetch before component mounts
  React.useEffect(() => {
    const fetchLogs = async () => {
      const token = await getAuthToken();
      const response = await fetch(`/dockerlogs/logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // handle response
      // add the response to a div and render
      const logsContainer = document.createElement("div");
      logsContainer.className = "d2e-logs__output";
      logsContainer.innerText = await response.text();
      document.querySelector(".d2e-logs__container")?.appendChild(logsContainer);
    };
    fetchLogs();
  }, []); 


  return (
    <div className="d2e-logs__container">
      {/* <iframe title="Logs" src={`${LOGS_URL}/logs`} frameBorder="0" width="100%" height="100%" /> */}
      {/* <div className="d2e-logs__output"></div> */}
    </div>
  );
};
