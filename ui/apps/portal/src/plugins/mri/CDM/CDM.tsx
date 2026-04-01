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
      const title = (event as CustomEvent<{ title?: string }>).detail?.title;
      if (typeof title === "string") setSubPages([{ label: title }]);
    };

    const handleBreadcrumbClear = () => {
      clearSubPages();
    };

    document.addEventListener("cdm-breadcrumb-update", handleBreadcrumbUpdate);
    document.addEventListener("cdm-breadcrumb-clear", handleBreadcrumbClear);

    // Enable the breadcrumb link to trigger navigation back inside the UI5 controller.
    setOnPluginNameClick(() => {
      document.dispatchEvent(new CustomEvent("cdm-breadcrumb-navigate-back"));
    });

    // Request UI5 to re-emit breadcrumb state in case the NavContainer
    // is still on a sub-page from a previous session (the UI5 ComponentContainer
    // is reused across React mount/unmount cycles by MRIComponent).
    document.dispatchEvent(new CustomEvent("cdm-breadcrumb-sync"));

    // Clean up all listeners and reset breadcrumb state on unmount.
    return () => {
      document.removeEventListener("cdm-breadcrumb-update", handleBreadcrumbUpdate);
      document.removeEventListener("cdm-breadcrumb-clear", handleBreadcrumbClear);
      clearSubPages();
      setOnPluginNameClick(null);
    };
  }, [setSubPages, clearSubPages, setOnPluginNameClick]);

  return <MRIComponent key={name} componentName={name} getToken={metadata?.getToken} />;
};
