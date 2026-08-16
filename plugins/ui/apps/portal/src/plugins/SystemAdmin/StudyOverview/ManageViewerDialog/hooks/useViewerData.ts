import { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from "react";
import { StudyDashboardTemplateData, ViewerCodeWithQueries } from "../../../../../types";
import { ConfigStrategy } from "../configStrategies";

export interface QueryEntry {
  queryName: string;
  sql: string;
}

export interface ViewerDataState {
  templates: StudyDashboardTemplateData[];
  savedCodes: ViewerCodeWithQueries[];
  code: string;
  originalCode: string;
  name: string;
  isNewName: boolean;
  queries: QueryEntry[];
  originalQueryNames: string[];
  initialLoading: boolean;
}

interface UseViewerDataParams {
  open: boolean;
  configId: string;
  configType: "dashboard" | "cohort" | "strategus";
  codeType: "dashboard" | "cohort";
  strategy: ConfigStrategy;
}

export function useViewerData({
  open,
  configId,
  configType,
  codeType,
  strategy,
}: UseViewerDataParams) {
  const [templates, setTemplates] = useState<StudyDashboardTemplateData[]>([]);
  const [savedCodes, setSavedCodes] = useState<ViewerCodeWithQueries[]>([]);
  const [code, setCode] = useState("");
  const [originalCode, setOriginalCode] = useState("");
  const [name, setName] = useState("");
  const [isNewName, setIsNewName] = useState(false);
  const [queries, setQueries] = useState<QueryEntry[]>([]);
  const [originalQueryNames, setOriginalQueryNames] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);

  // Set once the user edits name/code/queries. While true, a resolving fetch must
  // not overwrite their input.
  const dirtyRef = useRef(false);
  // Monotonic id so an older, slower fetch cannot clobber a newer one's result.
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;

    setInitialLoading(true);
    try {
      let fetchedTemplates: StudyDashboardTemplateData[] = [];
      try {
        fetchedTemplates = await strategy.fetchTemplates();
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
      if (isStale()) return;
      setTemplates(fetchedTemplates);

      if (strategy.supportsMultipleCodes) {
        let codes: ViewerCodeWithQueries[] = [];
        let failed = false;
        try {
          codes = await strategy.fetchCodes(configId, codeType);
        } catch (error) {
          console.error("Failed to fetch codes:", error);
          failed = true;
        }
        if (isStale()) return;

        setSavedCodes(failed ? [] : codes);

        // The user has already typed something — the server list is still worth
        // showing, but their edits win.
        if (dirtyRef.current) return;

        if (!failed && codes.length > 0) {
          const firstCode = codes[0];
          setIsNewName(false);
          setName(firstCode.name);
          setCode(firstCode.code);
          setOriginalCode(firstCode.code);
          setQueries(firstCode.queries.map((q) => ({ queryName: q.queryName, sql: q.sql })));
          setOriginalQueryNames(firstCode.queries.map((q) => q.queryName));
        } else {
          setIsNewName(true);
          setName("");
          setCode("");
          setOriginalCode("");
          setQueries([]);
          setOriginalQueryNames([]);
        }
      } else {
        // Strategus - single code
        let fetchedCode = "";
        try {
          fetchedCode = await strategy.fetchStrategusCode(configId);
        } catch (error) {
          console.error("Failed to fetch viewer code:", error);
        }
        if (isStale()) return;
        if (dirtyRef.current) return;
        setCode(fetchedCode);
        setOriginalCode(fetchedCode);
      }
    } finally {
      if (!isStale()) setInitialLoading(false);
    }
  }, [configId, codeType, strategy]);

  useEffect(() => {
    if (!open) return;
    // A freshly opened dialog has no user edits to protect.
    dirtyRef.current = false;
    fetchData();
  }, [open, fetchData]);

  const selectCode = useCallback((selectedName: string) => {
    // Explicitly loading a different code discards the working copy by design.
    dirtyRef.current = false;
    if (selectedName === "__new__") {
      setIsNewName(true);
      setName("");
      setCode("");
      setOriginalCode("");
      setQueries([]);
      setOriginalQueryNames([]);
    } else {
      setIsNewName(false);
      setName(selectedName);
      const selectedCode = savedCodes.find((c) => c.name === selectedName);
      if (selectedCode) {
        setCode(selectedCode.code);
        setOriginalCode(selectedCode.code);
        setQueries(selectedCode.queries.map((q) => ({ queryName: q.queryName, sql: q.sql })));
        setOriginalQueryNames(selectedCode.queries.map((q) => q.queryName));
      }
    }
  }, [savedCodes]);

  const applyTemplate = useCallback((templateFilename: string) => {
    if (templateFilename === "default") {
      setCode(originalCode);
    } else {
      const tmpl = templates.find((t) => t.filename === templateFilename);
      if (tmpl?.content) {
        setCode(tmpl.content);
      }
    }
  }, [originalCode, templates]);

  const updateCode = useCallback((newCode: string) => {
    dirtyRef.current = true;
    setCode(newCode);
  }, []);

  const updateName = useCallback((newName: string) => {
    dirtyRef.current = true;
    setName(newName);
  }, []);

  const updateQueries = useCallback<Dispatch<SetStateAction<QueryEntry[]>>>((value) => {
    dirtyRef.current = true;
    setQueries(value);
  }, []);

  const markSaved = useCallback(() => {
    dirtyRef.current = false;
    setOriginalCode(code);
    const currentQueryNames = queries.filter((q) => q.queryName).map((q) => q.queryName);
    setOriginalQueryNames(currentQueryNames);
  }, [code, queries]);

  return {
    templates,
    savedCodes,
    code,
    originalCode,
    name,
    isNewName,
    queries,
    originalQueryNames,
    initialLoading,
    setQueries: updateQueries,
    selectCode,
    applyTemplate,
    updateCode,
    updateName,
  markSaved,
  };
}
