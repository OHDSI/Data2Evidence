import { useContext } from "react";
import { ConceptSetsContext } from "../context/ConceptSetsContext";

export const usePortal = () => {
  const { portal } = useContext(ConceptSetsContext);

  const getToken = async (): Promise<string | undefined> => {
    if (portal.getToken) {
      return await portal.getToken();
    }
    return undefined;
  };

  return {
    userName: portal.userName,
    userId: portal.userId,
    datasetId: portal.datasetId || "",
    getToken,
    features: portal.features,
    featuresLoading: portal.featuresLoading,
  };
};
