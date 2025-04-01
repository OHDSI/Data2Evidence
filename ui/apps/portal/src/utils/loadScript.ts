import env from "../env";

type Callback = () => void;

const PA_SAP_CORE_UI_URL = "ui/sap-ui-core.js";

const _loadScript = (
  src: string,
  onload: Callback = () => void 0,
  attrs: { [attr: string]: string } = {}
): Callback => {
  let script: HTMLScriptElement | null = document.querySelector(`script[src="${src}"]`);
  if (!script) {
    // Create script
    script = document.createElement("script");
    script.src = src;
    script.onload = onload;
    script.async = true;
    script.type = "text/javascript";
    for (const [attr, val] of Object.entries(attrs)) {
      script.setAttribute(attr, val);
    }
    document.body.appendChild(script);
  } else {
    // Script already imported, run callback
    onload();
  }
  return () => {
    if (script) {
      document.body.removeChild(script);
    }
  };
};

export const loadScript = (src: string): Callback => _loadScript(src);

export const loadEsModuleScript = (src: string, onLoad: () => void): Callback =>
  _loadScript(src, onLoad, { type: "module" });

export const loadSapScript = (onloadCallback: Callback): Callback => {
  return _loadScript(PA_SAP_CORE_UI_URL, onloadCallback, {
    id: "sap-ui-bootstrap",
    "data-sap-ui-theme": "sap_belize",
    "data-sap-ui-libs": "sap.m",
    "data-sap-ui-compatVersion": "edge",
    "data-sap-ui-preload": "async",
    "data-sap-ui-resourceroots": JSON.stringify({
      hc: `${env.REACT_APP_DN_BASE_URL}hc`,
      "hc.hph": `${env.REACT_APP_DN_BASE_URL}hc/hph`,
      "hc.hph.cdw.config": `${env.REACT_APP_DN_BASE_URL}hc/hph/cdw/config`,
      "hc.mri.pa.config": `${env.REACT_APP_DN_BASE_URL}hc/mri/pa/config`,
    }),
  });
};

export const loadStyleSheet = (href: string): Callback => {
  let link: HTMLLinkElement | null = document.querySelector(`link[href="${href}"]`);
  if (!link) {
    // Create link
    link = document.createElement("link");
    link.href = href;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  return () => {
    if (link) {
      document.head.removeChild(link);
    }
  };
};
