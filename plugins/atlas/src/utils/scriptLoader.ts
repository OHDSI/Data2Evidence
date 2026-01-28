export type CleanupCallback = () => void;

// Load script via fetch (uses intercepted fetch with auth) then inject as inline script
// We prepend __webpack_public_path__ to ensure webpack loads chunks from the right location
export async function loadScriptWithAuth(src: string, onload?: () => void, attrs?: Record<string, string>): Promise<CleanupCallback> {
  // Check if already loaded
  let existingScript: HTMLScriptElement | null = document.querySelector(`script[data-src="${src}"]`);
  if (existingScript) {
    onload?.();
    return () => {
      if (existingScript && existingScript.parentNode === document.head) {
        document.head.removeChild(existingScript);
      }
    };
  }

  // Fetch script content with auth (goes through our fetch interceptor)
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to load script: ${src} (${response.status})`);
  }
  let scriptContent = await response.text();

  // Determine the public path from the src URL (e.g., /d2e/mri/js/app.js -> /d2e/mri/)
  // We go up one directory level because chunks are referenced as "js/chunk.js" not just "chunk.js"
  const pathParts = src.split('/');
  pathParts.pop(); // remove filename
  pathParts.pop(); // remove "js" directory
  const srcPath = pathParts.join('/') + '/';

  // Patch webpack's public path assignment in the bundled code
  // vue-mri is built with publicPath: '' which sets t.p="" in the webpack runtime
  // We need to replace this with the actual path so chunks load correctly
  // Match patterns like: t.p="" or n.p="" or e.p="" (webpack runtime variable names vary)
  scriptContent = scriptContent.replace(/([a-zA-Z])\.p=""/g, `$1.p="${srcPath}"`);

  // Inject as inline script (not blob URL) to avoid path resolution issues
  const script = document.createElement('script');
  script.textContent = scriptContent;
  script.setAttribute('data-src', src); // Track original URL

  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      script.setAttribute(key, value);
    });
  }

  document.head.appendChild(script);

  // Call onload synchronously since inline scripts execute immediately
  onload?.();

  return () => {
    if (script.parentNode === document.head) {
      document.head.removeChild(script);
    }
  };
}

// Original loadScript for external URLs (CDN) that don't need auth
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

// Load stylesheet via fetch (with auth) then inject as style tag
export async function loadStyleSheetWithAuth(href: string): Promise<CleanupCallback> {
  // Check if already loaded
  let existingStyle: HTMLStyleElement | null = document.querySelector(`style[data-href="${href}"]`);
  if (existingStyle) {
    return () => {
      if (existingStyle && existingStyle.parentNode === document.head) {
        document.head.removeChild(existingStyle);
      }
    };
  }

  // Fetch CSS content with auth
  const response = await fetch(href);
  if (!response.ok) {
    throw new Error(`Failed to load stylesheet: ${href} (${response.status})`);
  }
  const cssContent = await response.text();

  // Inject as style tag
  const style = document.createElement('style');
  style.setAttribute('data-href', href); // Track original URL
  style.textContent = cssContent;
  document.head.appendChild(style);

  return () => {
    if (style.parentNode === document.head) {
      document.head.removeChild(style);
    }
  };
}

// Original loadStyleSheet for external URLs that don't need auth
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
