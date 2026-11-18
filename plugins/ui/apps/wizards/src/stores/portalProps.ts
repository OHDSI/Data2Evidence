import { defineStore } from "pinia";
import type { PortalProps } from "../types/portal";
import { shallowRef } from "vue";

export type PortalPropsState = Pick<
  PortalProps,
  "appId" | "getToken" | "username" | "datasetId" | "locale" | "isAtlas" | "authContext" | "hostContext"
>;

export const usePortalPropsStore = defineStore("wizardPortalProps", () => {
  const props = shallowRef<PortalPropsState>({});

  function applyProps(next: PortalProps) {
    props.value = {
      appId: next.appId,
      getToken: next.getToken,
      username: next.username,
      datasetId: next.datasetId,
      locale: next.locale,
      isAtlas: next.isAtlas,
      authContext: next.authContext,
      hostContext: next.hostContext,
    };
  }

  return { props, applyProps };
});
