import React, { createContext, FC, ReactNode, useCallback, useContext, useState } from "react";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface SetupBreadcrumbContextType {
  subPages: BreadcrumbItem[];
  setSubPages: (items: BreadcrumbItem[]) => void;
  clearSubPages: () => void;
  onPluginNameClick: (() => void) | null;
  setOnPluginNameClick: (callback: (() => void) | null) => void;
}
interface SetupBreadcrumbProviderProps {
  children: ReactNode;
}

const SetupBreadcrumbContext = createContext<SetupBreadcrumbContextType>({
  subPages: [],
  setSubPages: () => {},
  clearSubPages: () => {},
  onPluginNameClick: null,
  setOnPluginNameClick: () => {},
});

export const SetupBreadcrumbProvider: FC<SetupBreadcrumbProviderProps> = ({ children }) => {
  const [subPages, setSubPagesState] = useState<BreadcrumbItem[]>([]);
  const [onPluginNameClick, setOnPluginNameClickState] = useState<(() => void) | null>(null);

  const setSubPages = useCallback((items: BreadcrumbItem[]) => {
    setSubPagesState(items);
  }, []);

  const clearSubPages = useCallback(() => {
    setSubPagesState([]);
  }, []);

  const setOnPluginNameClick = useCallback((callback: (() => void) | null) => {
    setOnPluginNameClickState(() => callback);
  }, []);

  return (
    <SetupBreadcrumbContext.Provider
      value={{ subPages, setSubPages, clearSubPages, onPluginNameClick, setOnPluginNameClick }}
    >
      {children}
    </SetupBreadcrumbContext.Provider>
  );
};

export const useSetupBreadcrumb = () => {
  return useContext(SetupBreadcrumbContext);
};
