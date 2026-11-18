import { createApp, h, type App as VueApp } from "vue";
import singleSpaVue from "single-spa-vue";
import { createVuetify } from "vuetify";
import { keepMountPropsOnUpdate } from "./utils/parcelLifecycles";
import { type PortalProps } from "./types/portal";
import { normalizeWizardPortalProps } from "./utils/portalProps";
import { createPinia, type Pinia } from "pinia";
import { usePortalPropsStore } from "./stores/portalProps";
import { buildVuetifyOptions } from "@ohdsi/atlas-ui";
import "@ohdsi/atlas-ui/style.css";
import "@d2e/ui/tokens.css";
import "./global.css";
import App from "./App.vue";

type MountProps = PortalProps & {
  name: string;
  domElement?: HTMLElement;
  containerId?: string;
};

let pinia: Pinia | null = null;

function resolveContainer(props: MountProps): HTMLElement | undefined {
  if (props?.domElement) {
    return props.domElement;
  }

  const containerId = props?.containerId;
  if (containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      return container;
    }
    console.warn("[Wizards] Container element not found in DOM:", containerId);
  }

  console.warn("[Wizards] No containerId provided, using single-spa default");
  return undefined;
}

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: async (props: MountProps) => ({
    el: resolveContainer(props),
    render() {
      return h(App);
    },
  }),
  handleInstance: (app: VueApp, props: object) => {
    pinia = createPinia();
    app.use(pinia);
    app.use(createVuetify({ ...buildVuetifyOptions(), theme: false }));
    usePortalPropsStore(pinia).applyProps(normalizeWizardPortalProps(props as MountProps));
    app.config.errorHandler = (err, _instance, info) => {
      console.error("[Wizards] Uncaught error:", err, info);
    };
  },
});

export const { bootstrap, mount, unmount, update } = keepMountPropsOnUpdate<MountProps>({
  bootstrap: vueLifecycles.bootstrap,
  mount: vueLifecycles.mount,
  update: async (props) => {
    if (pinia) usePortalPropsStore(pinia).applyProps(normalizeWizardPortalProps(props));
  },
  unmount: async (props) => {
    const result = await vueLifecycles.unmount(props);
    pinia = null;
    return result;
  },
});
