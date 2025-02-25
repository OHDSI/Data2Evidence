import { Button } from "@portal/components";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import React, { FC } from "react";
import "../style/Main.scss";
import { useTranslation } from "../../../contexts";

interface EmptyNotebookProps extends PageProps<ResearcherStudyMetadata> {
  createNotebook: () => void;
  importJupyterNb: (event: any) => Promise<void>;
}

export const EmptyNotebook: FC<EmptyNotebookProps> = ({ createNotebook, importJupyterNb }) => {
  const { getText, i18nKeys } = useTranslation();
  const hiddenFileInput = React.useRef<HTMLInputElement>(null);

  const handleJupyterInput = () => {
    if (hiddenFileInput.current !== null) {
      hiddenFileInput.current.click();
    }
  };

  return (
    <div className="notebook-main">
      <div>
        <h1>{getText(i18nKeys.EMPTY_NOTEBOOK__TITLE)}</h1>
        <Button text={getText(i18nKeys.EMPTY_NOTEBOOK__ADD)} onClick={createNotebook} />
        <Button
          className="button-import"
          text={getText(i18nKeys.EMPTY_NOTEBOOK__IMPORT)}
          onClick={handleJupyterInput}
        />
        <input
          type="file"
          name="jupyterFile"
          ref={hiddenFileInput}
          onChange={importJupyterNb}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
};
