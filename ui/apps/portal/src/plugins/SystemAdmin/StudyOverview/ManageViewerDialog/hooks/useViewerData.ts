import { useState, useEffect, useCallback } from "react";
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

  const fetchData = useCallback(async () => {
    setInitialLoading(true);
    try {
      // Fetch templates (won't fail the whole operation)
      let fetchedTemplates: StudyDashboardTemplateData[] = [];
      try {
        fetchedTemplates = await strategy.fetchTemplates();
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
      setTemplates(fetchedTemplates);

      // Fetch codes based on config type
      if (strategy.supportsMultipleCodes) {
        setIsNewName(false);
        try {
          const codes = await strategy.fetchCodes(configId, codeType);
          setSavedCodes(codes);
          if (codes.length > 0) {
            const firstCode = codes[0];
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
        } catch (error) {
          console.error("Failed to fetch codes:", error);
          setSavedCodes([]);
          setIsNewName(true);
          setName("");
          setCode("");
          setOriginalCode("");
          setQueries([]);
          setOriginalQueryNames([]);
        }
      } else {
        // Strategus - single code
        try {
          const fetchedCode = await strategy.fetchStrategusCode(configId);
          setCode(fetchedCode);
          setOriginalCode(fetchedCode);
        } catch (error) {
          console.error("Failed to fetch viewer code:", error);
          setCode("");
          setOriginalCode("");
        }
      }
    } finally {
      setInitialLoading(false);
    }
  }, [configId, codeType, strategy]);

  useEffect(() => {
    if (!open) return;
    fetchData();
  }, [open, fetchData]);

  const selectCode = useCallback((selectedName: string) => {
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
    setCode(newCode);
  }, []);

  const updateName = useCallback((newName: string) => {
    setName(newName);
  }, []);

  const markSaved = useCallback(() => {
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
    setQueries,
    selectCode,
    applyTemplate,
    updateCode,
    updateName,
  markSaved,
  };
}
