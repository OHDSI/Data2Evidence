import React, { FC, useEffect } from "react";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import { getAuthToken } from "../../../containers/auth";
import "./Logs.scss";

const LOGS_URL = "/dockerlogs";
interface LogsPageProps extends PageProps<SystemAdminPageMetadata> {}

export const Logs: FC<LogsPageProps> = () => {

  useEffect(() => {
    const setCookie = async () => {
      const expires = new Date(Date.now() + 3600000).toUTCString();
      const token = await getAuthToken();
      document.cookie = `authtoken=${token}; path=/dockerlogs; secure; SameSite=Strict; expires=${expires}`;
      document.cookie = `authtoken=${token}; path=/dockerlogs/*; secure; SameSite=Strict; expires=${expires}`;
    };
    setCookie();
  }, []);

  return (
    <div className="d2e-logs__container">
      <iframe title="Logs" src={`${LOGS_URL}`} frameBorder="0" width="100%" height="100%" />
    </div>
  );
};
