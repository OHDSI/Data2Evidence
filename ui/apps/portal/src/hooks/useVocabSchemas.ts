import { useCallback, useEffect, useState } from "react";
import { DbCredentialsMgr } from "../axios/db-credentials-mgr";

export const useVocabSchemas = (dialect: string): [string[]] => {
  const [vocabSchemas, setVocabSchemas] = useState<string[]>([]);

  const getVocabSchemas = useCallback(
    async (dialect: string) => {
      try {
        const dbCredentialsMgr = new DbCredentialsMgr();
        const vocabSchemas = await dbCredentialsMgr.getVocabSchemas(dialect);
        setVocabSchemas(vocabSchemas);
      } catch (error) {
        console.error(error);
      }
    },
    [setVocabSchemas]
  );

  useEffect(() => {
    getVocabSchemas(dialect);
  }, [dialect, getVocabSchemas]);

  return [vocabSchemas];
};
