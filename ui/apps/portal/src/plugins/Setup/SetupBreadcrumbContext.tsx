import React, { createContext, FC, ReactNode, useCallback, useContext, useState } from "react";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface SetupBreadcrumbContextType {
  subPages: BreadcrumbItem[];
  setSubPages: (items: BreadcrumbItem[]) => void;
  clearSubPages: () => void;
}

const SetupBreadcrumbContext = createContext<SetupBreadcrumbContextType>({
  subPages: [],
  setSubPages: () => {},
  clearSubPages: () => {},
});

interface SetupBreadcrumbProviderProps {
  children: ReactNode;
}

export const SetupBreadcrumbProvider: FC<SetupBreadcrumbProviderProps> = ({ children }) => {
  const [subPages, setSubPagesState] = useState<BreadcrumbItem[]>([]);

  const setSubPages = useCallback((items: BreadcrumbItem[]) => {
    setSubPagesState(items);
  }, []);

  const clearSubPages = useCallback(() => {
    setSubPagesState([]);
  }, []);

  return (
    <SetupBreadcrumbContext.Provider value={{ subPages, setSubPages, clearSubPages }}>
      {children}
    </SetupBreadcrumbContext.Provider>
  );
};

export const useSetupBreadcrumb = () => {
  return useContext(SetupBreadcrumbContext);
};

