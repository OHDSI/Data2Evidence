import React, { FC, useCallback, useEffect, useState } from "react";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { StarboardNotebook } from "./utils/notebook";
import { StarboardEmbed } from "@data2evidence/d2e-starboard-wrap";
import { Card, Loader } from "@portal/components";
import { api } from "../../axios/api";
import { useActiveDataset, useFeedback, useTranslation } from "../../contexts";
import { EmptyNotebook } from "./components/EmptyNotebook";
import { Header } from "./components/NotebookHeader/NotebookHeader";
import { convertJupyterToStarboard, notebookContentToText } from "./utils/jupystar";
import { i18nKeys } from "../../contexts/app-context/states";
import env from "../../env";
import "./Starboard.scss";
import { getAuthToken } from "../../containers/auth/auth";

const MRI_ROOT_URL = "analytics-svc";
const uiFilesUrl = env.REACT_APP_DN_BASE_URL;
const zipUrl = `${uiFilesUrl}starboard-notebook-base/alp-starboard-notebook-base.zip`;
const awsLambdaUrl = "code-suggestion";
interface StarboardProps extends PageProps<ResearcherStudyMetadata> {}

export const Starboard: FC<StarboardProps> = ({ metadata }) => {
  const { getText } = useTranslation();
  const { setFeedback } = useFeedback();
  const [loading, setLoading] = useState(true);
  const { activeDataset } = useActiveDataset();
  const activeDatasetId = activeDataset.id;

  // JWT Token and Jupyter Kernel Extraction
  const [jwtToken, setJWTToken] = useState("");

  const setupPYQE = `
import micropip
await micropip.install('ssl')
await micropip.install('pyjwt==2.9.0')
await micropip.install('${uiFilesUrl}starboard-notebook-base/pyodidepyqe-0.0.2-py3-none-any.whl', keep_going=True)
os.environ['PYQE_URL'] = '${MRI_ROOT_URL}/'
os.environ['PYQE_TLS_CLIENT_CA_CERT_PATH'] = ''`;

  const [runtime, setRuntime] = useState<StarboardEmbed>();
  const [unsaved, setUnsaved] = useState(false);

  const [notebooks, setNotebooks] = useState<StarboardNotebook[]>();
  const [activeNotebook, setActiveNotebook] = useState<StarboardNotebook | undefined>();
  const [isShared, setIsShared] = useState<boolean | undefined>();

  // Get Bearer Token for code-suggestion
  const [accessToken, setToken] = useState("");
  const getBearerToken = useCallback(async () => {
    const token = await getAuthToken(false);
    return `Bearer ${token}`;
  }, []);
  useEffect(() => {
    const fetchToken = async () => {
      const bearerToken = await getBearerToken();
      setToken(bearerToken);
    };
    fetchToken();
  }, []);

  const updateActiveNotebook = useCallback((notebook?: StarboardNotebook) => {
    setActiveNotebook(notebook);
    setIsShared(notebook?.isShared ?? false);
  }, []);

  const fetchNotebooks = useCallback(
    async (runInBackground?: boolean) => {
      try {
        if (!runInBackground) setLoading(true);
        const notebooks = await api.studyNotebook.getNotebookList(activeDatasetId);
        if (notebooks.length === 0) updateActiveNotebook(undefined);
        if (!runInBackground) updateActiveNotebook(notebooks[0]);
        setNotebooks(notebooks);
      } catch (err) {
        console.error(err);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.STARBOARD__ERROR_FETCH),
        });
      } finally {
        setLoading(false);
      }
    },
    [setFeedback, getText, updateActiveNotebook]
  );

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  const loadNotebookContent = useCallback(
    async (notebookContent: string) => {
      if (jwtToken === "") {
        const findJwtToken = (await metadata?.getToken()) || "";
        setJWTToken(findJwtToken);
      }

      const tokenAndPyqeScript = "\n# %% [python]\nimport os\nos.environ['TOKEN'] = '" + jwtToken + "'" + setupPYQE;
      notebookContent += tokenAndPyqeScript;

      const mount = document.querySelector("#starboard-root");
      while (mount?.firstChild) {
        mount.removeChild(mount.firstChild);
      }

      const embedEl = new StarboardEmbed({
        notebookContent: notebookContent || "",
        src: `${uiFilesUrl}starboard-notebook-base/index.html`,
        preventNavigationWithUnsavedChanges: true,
        suggestionUrl: `${uiFilesUrl}${awsLambdaUrl}?datasetId=${activeDatasetId}`,
        bearerToken: accessToken,
        onUnsavedChangesStatusChange: () => setUnsaved(true),
      });

      mount?.appendChild(embedEl);
      setRuntime(embedEl);
      setUnsaved(false);
    },
    [jwtToken, metadata, setupPYQE]
  );

  useEffect(() => {
    if (notebooks?.length !== 0 && activeNotebook && activeNotebook !== undefined) {
      const notebookContent = activeNotebook?.notebookContent || "";
      loadNotebookContent(notebookContent);
    }
  }, [activeNotebook, loadNotebookContent, notebooks]);

  const handleReadContent = useCallback(() => {
    return runtime?.notebookContent || "";
  }, [runtime]);

  const createNotebook = useCallback(async () => {
    try {
      const newNotebook: StarboardNotebook = await api.studyNotebook.createNotebook(activeDatasetId, "Untitled", "");
      fetchNotebooks(true);
      updateActiveNotebook(newNotebook);
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.STARBOARD__ERROR_CREATE),
      });
    }
  }, [fetchNotebooks, updateActiveNotebook, setFeedback, getText]);

  // Check Jupyter Notebook Name if it exist in the database
  const checkNotebookName = async (name: string) => {
    const allNotebooks: any[] = await api.studyNotebook.getNotebookList(activeDatasetId);
    let isFound = true;
    let nameCount = 0;
    let notebookName = name;

    // Loop continues when the name + number is found
    while (isFound) {
      const exist = allNotebooks.some((note) => note.name === notebookName);
      if (exist) {
        // Found a notebook with matching name
        nameCount++;
        notebookName = name + ` ${nameCount}`;
      } else {
        isFound = false;
      }
    }

    return notebookName;
  };

  // Import Jupyter Notebook and create the notebook.
  const importJupyterNb = async (event: any) => {
    const myFile = event.target.files[0];
    const text = await myFile.text();
    try {
      let notebookName = myFile.name.replace(".ipynb", "");
      notebookName = await checkNotebookName(notebookName);
      const notebook_json = await JSON.parse(text);
      const jupyterFile = notebook_json;
      // Starboard Notebook in NotebookContent typeof data
      const starboardNotebook = convertJupyterToStarboard(jupyterFile, {});
      // Converting NotebookContent to Starboard String
      const notebookContent = notebookContentToText(starboardNotebook);
      const newNotebook: StarboardNotebook = await api.studyNotebook.createNotebook(
        activeDatasetId,
        notebookName,
        notebookContent
      );
      fetchNotebooks(true);
      updateActiveNotebook(newNotebook);
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.STARBOARD__ERROR_IMPORT),
      });
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (notebooks?.length === 0) {
    return <EmptyNotebook createNotebook={createNotebook} importJupyterNb={importJupyterNb} />;
  }

  return (
    <div className="starboard">
      <Header
        metadata={metadata}
        notebooks={notebooks}
        activeNotebook={activeNotebook}
        updateActiveNotebook={updateActiveNotebook}
        currentContent={handleReadContent}
        createNotebook={createNotebook}
        fetchNotebooks={fetchNotebooks}
        zipUrl={zipUrl}
        isShared={isShared}
        setIsShared={setIsShared}
        activeDatasetId={activeDatasetId}
      />
      <Card>
        <div id="starboard-root" />
      </Card>
    </div>
  );
};
