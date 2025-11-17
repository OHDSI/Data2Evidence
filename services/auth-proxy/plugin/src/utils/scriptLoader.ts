export type CleanupCallback = () => void;

export function loadScript(src: string, onload?: () => void, attrs?: Record<string, string>): CleanupCallback {
  let script: HTMLScriptElement | null = document.querySelector(`script[src="${src}"]`);

  if (!script) {
    script = document.createElement('script');
    script.src = src;
    script.async = true;

    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        script!.setAttribute(key, value);
      });
    }

    if (onload) {
      script.onload = onload;
    }

    document.head.appendChild(script);
  } else if (onload) {
    onload();
  }

  return () => {
    if (script && script.parentNode === document.head) {
      document.head.removeChild(script);
    }
  };
}

export function loadStyleSheet(href: string): CleanupCallback {
  let link: HTMLLinkElement | null = document.querySelector(`link[href="${href}"]`);

  if (!link) {
    link = document.createElement('link');
    link.href = href;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  return () => {
    if (link && link.parentNode === document.head) {
      document.head.removeChild(link);
    }
  };
}

export function loadSapScript(sapCoreUrl: string, onload: () => void, baseUrl: string): CleanupCallback {
  return loadScript(sapCoreUrl, onload, {
    id: 'sap-ui-bootstrap',
    'data-sap-ui-theme': 'sap_belize',
    'data-sap-ui-libs': 'sap.m',
    'data-sap-ui-resourceroots': JSON.stringify({
      hc: `${baseUrl}hc`,
      'hc.hph': `${baseUrl}hc/hph`,
      'hc.mri.pa.config': `${baseUrl}hc/mri/pa/config`,
    }),
  });
}

export function injectInlineScript(code: string, id?: string): CleanupCallback {
  const script = document.createElement('script');
  script.textContent = code;
  script.type = 'module';

  if (id) {
    script.id = id;
  }

  document.head.appendChild(script);

  return () => {
    if (script.parentNode === document.head) {
      document.head.removeChild(script);
    }
  };
}
