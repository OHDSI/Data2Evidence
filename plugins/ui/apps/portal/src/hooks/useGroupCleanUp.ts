import { useEffect } from "react";
import { api } from "../axios/api";

export const useGroupCleanUp = (userTenants: string[], tenants: string[]) => {
  useEffect(() => {
    let hasDeletedTenant = false;
    if (userTenants.length > 0) {
      hasDeletedTenant = !userTenants.every((t) => tenants.includes(t));
    }

    if (hasDeletedTenant && userTenants.length > 0 && tenants.length > 0) {
      api.userMgmt.cleanUpGroups();
    }
  }, [userTenants, tenants]);
};
