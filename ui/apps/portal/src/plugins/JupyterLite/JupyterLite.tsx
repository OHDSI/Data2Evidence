import { Card } from "@portal/components";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import React, { FC } from "react";
import env from "../../env";
import "./JupyterLite.scss";

const JUPYTERLITE_BASE_URL = env.REACT_APP_JUPYTERLITE_URL || "https://jupyter.org/try-jupyter/lab/";

interface JupyterLiteProps extends PageProps<ResearcherStudyMetadata> {}

export const JupyterLite: FC<JupyterLiteProps> = () => {
  return (
    <div className="jupyterlite">
      <Card>
        <iframe
          src={JUPYTERLITE_BASE_URL}
          title="JupyterLite Notebook"
          className="jupyterlite-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"
          allow="clipboard-read; clipboard-write"
        />
      </Card>
    </div>
  );
};

export default JupyterLite;
