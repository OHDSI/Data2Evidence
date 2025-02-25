import { useCallback, useEffect, useState } from "react";
import { DbCredentialsMgr } from "../axios/db-credentials-mgr";

export const useDbVocabSchemas = (dialect: string): [{ [key: string]: string[] }] => {
  const [dbVocabSchemas, setDbVocabSchemas] = useState<{ [key: string]: string[] }>({});

  const getDbVocabSchemas = useCallback(
    async (dialect: string) => {
      try {
        const dbCredentialsMgr = new DbCredentialsMgr();
        const dbVocabSchemas = await dbCredentialsMgr.getDbVocabSchemas(dialect);
        setDbVocabSchemas(dbVocabSchemas);
      } catch (error) {
        console.error(error);
      }
    },
    [setDbVocabSchemas]
  );

  useEffect(() => {
    if (dialect) {
      getDbVocabSchemas(dialect);
    }
  }, [dialect, getDbVocabSchemas]);

  return [dbVocabSchemas];
};
