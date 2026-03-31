import React, { FC, useEffect } from "react";
import { PageProps, SetupPageMetadata } from "@portal/plugin";
import MRIComponent from "../utils/MRIComponent";
import { useSetupBreadcrumb } from "../../Setup/SetupBreadcrumbContext";
import "./CDM.scss";

interface CDMProps extends PageProps<SetupPageMetadata> {}

export const CDM: FC<CDMProps> = ({ metadata }) => {
  const name = "hc.hph.cdw.config.ui";
  const { setSubPages, clearSubPages, setOnPluginNameClick } = useSetupBreadcrumb();

  useEffect(() => {
    const handleBreadcrumbUpdate = (event: Event) => {
      const { title } = (event as CustomEvent).detail;
      setSubPages([{ label: title }]);
    };

    const handleBreadcrumbClear = () => {
      clearSubPages();
    };

    document.addEventListener("cdm-breadcrumb-update", handleBreadcrumbUpdate);
    document.addEventListener("cdm-breadcrumb-clear", handleBreadcrumbClear);

    setOnPluginNameClick(() => {
      document.dispatchEvent(new CustomEvent("cdm-breadcrumb-navigate-back"));
    });

    return () => {
      document.removeEventListener("cdm-breadcrumb-update", handleBreadcrumbUpdate);
      document.removeEventListener("cdm-breadcrumb-clear", handleBreadcrumbClear);
      clearSubPages();
      setOnPluginNameClick(null);
    };
  }, [setSubPages, clearSubPages, setOnPluginNameClick]);

  return <MRIComponent key={name} componentName={name} getToken={metadata?.getToken} />;
};
