import { useCallback, useEffect, useState } from "react";
import { DbCredentialsMgr } from "../axios/db-credentials-mgr";

export const useDbVocabSchemas = (dbCode: string): [{ [key: string]: string[] }] => {
  const [dbVocabSchemas, setDbVocabSchemas] = useState<{ [key: string]: string[] }>({});

  const getDbVocabSchemas = useCallback(
    async (dbCode: string) => {
      try {
        const dbCredentialsMgr = new DbCredentialsMgr();
        const dbList = await dbCredentialsMgr.getDbList();
        const dbVocabSchemas = dbList
          .filter((db) => db.code === dbCode)
          .reduce<{ [key: string]: string[] }>((acc, item) => {
            acc[item.code] = item.vocabSchemas;
            return acc;
          }, {});

        setDbVocabSchemas(dbVocabSchemas);
      } catch (error) {
        console.error(error);
      }
    },
    [setDbVocabSchemas]
  );

  useEffect(() => {
    if (dbCode) {
      getDbVocabSchemas(dbCode);
    }
  }, [dbCode, getDbVocabSchemas]);

  return [dbVocabSchemas];
};
