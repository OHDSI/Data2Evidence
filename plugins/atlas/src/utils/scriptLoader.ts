export type CleanupCallback = () => void;

// --- CSS scoping -----------------------------------------------------------
// vue-mri bundles its own Vuetify whose global/`:root`/component rules collide
// with Atlas3 (also Vuetify). To contain it without an iframe, we rewrite every
// vue-mri rule so it only matches inside vue-mri's mount (`.vue-main`):
//  - `:root` / `html` / `body` / `*` (root targets)  ->  the scope selector
//  - everything else  ->  `<scope> <selector>`
// @keyframes/@font-face/@import are left global (harmless / required).
const ROOT_SELECTOR_TOKENS = /^(:root|html|body|\*)\b/i;

function scopeSelectorText(selectorText: string, scope: string): string {
  return selectorText
    .split(',')
    .map((raw) => {
      const sel = raw.trim();
      if (!sel) return raw;
      const exact = sel.toLowerCase();
      if (exact === ':root' || exact === 'html' || exact === 'body' || exact === '*') {
        return scope;
      }
      const m = sel.match(ROOT_SELECTOR_TOKENS);
      if (m) {
        // e.g. `body .foo` -> `.vue-main .foo`, `html.dark` -> `.vue-main.dark`
        return scope + sel.slice(m[0].length);
      }
      return `${scope} ${sel}`;
    })
    .join(', ');
}

export function scopeCssRules(rules: CSSRuleList, scope: string): string {
  let out = '';
  for (const rule of Array.from(rules) as CSSRule[]) {
    if (rule.type === 1 /* STYLE_RULE */) {
      const r = rule as CSSStyleRule;
      out += `${scopeSelectorText(r.selectorText, scope)}{${r.style.cssText}}`;
    } else if (rule.type === 4 /* MEDIA_RULE */) {
      const r = rule as CSSMediaRule;
      out += `@media ${r.media.mediaText}{${scopeCssRules(r.cssRules, scope)}}`;
    } else if (rule.type === 12 /* SUPPORTS_RULE */) {
      const r = rule as CSSSupportsRule;
      out += `@supports ${r.conditionText}{${scopeCssRules(r.cssRules, scope)}}`;
    } else {
      // @keyframes (7), @font-face (5), @import (3), etc. — keep global.
      out += rule.cssText;
    }
  }
  return out;
}

export function scopeCssText(cssText: string, scope: string): string {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    return scopeCssRules(sheet.cssRules, scope);
  } catch {
    return cssText; // parsing failed — fall back to unscoped
  }
}

// Rewrite an already-injected <style> in place so its rules are scoped.
export function scopeStyleElement(styleEl: HTMLStyleElement, scope: string): void {
  if (styleEl.dataset.mriScoped) return;
  styleEl.dataset.mriScoped = '1';
  try {
    const rules = styleEl.sheet?.cssRules;
    if (rules && rules.length) {
      styleEl.textContent = scopeCssRules(rules, scope);
    }
  } catch {
    /* sheet not accessible/ready */
  }
}

// Fetch a stylesheet, scope it, and inject it as a <style> (so a vue-mri CSS
// file can't restyle the Atlas3 host).
export async function loadScopedStyleSheet(href: string, scope: string): Promise<CleanupCallback> {
  let css = '';
  try {
    const resp = await fetch(href);
    css = await resp.text();
  } catch {
    /* leave empty */
  }
  const style = document.createElement('style');
  style.dataset.mriScoped = '1';
  style.setAttribute('data-href', href);
  style.textContent = scopeCssText(css, scope);
  document.head.appendChild(style);
  return () => {
    if (style.parentNode) style.parentNode.removeChild(style);
  };
}


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

// Load a script as an ES module (type="module"). Required for vue-mri's
// Vite-built bundle, which uses import.meta and must run as a module.
// Static assets under /d2e/mri/ are served without auth, so no auth header
// is needed (and a real src — not a blob — lets SAP UI5 self-locate).
export function loadEsModuleScript(src: string, onload?: () => void): CleanupCallback {
  return loadScript(src, onload, { type: 'module' });
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

// Mirror the d2e portal's SAP UI5 bootstrap (apps/portal/src/utils/loadScript.ts).
// baseUrl is the d2e prefix incl. trailing slash, e.g. `${origin}/d2e/`.
export function loadSapScript(sapCoreUrl: string, onload: () => void, baseUrl: string): CleanupCallback {
  return loadScript(sapCoreUrl, onload, {
    id: 'sap-ui-bootstrap',
    'data-sap-ui-theme': 'sap_belize',
    'data-sap-ui-libs': 'sap.m',
    'data-sap-ui-compatVersion': 'edge',
    'data-sap-ui-preload': 'async',
    'data-sap-ui-resourceroots': JSON.stringify({
      hc: `${baseUrl}hc`,
      'hc.hph': `${baseUrl}hc/hph`,
      'hc.hph.cdw.config': `${baseUrl}hc/hph/cdw/config`,
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
