/**
 * D3 v3 wrapper module
 *
 * D3 v3.5.17 is patched to replace `this` with `window` for ESM compatibility.
 * The original IIFE uses `this.document` which becomes undefined when bundled.
 *
 * The patched version in ./vendor/d3.v3.patched.js:
 * - Replaces `this.document` → `window.document`
 * - Replaces `this.Element.prototype` → `window.Element.prototype`
 * - Replaces `this.CSSStyleDeclaration.prototype` → `window.CSSStyleDeclaration.prototype`
 * - Uses `module.exports = d3` for CommonJS compatibility
 *
 * This allows proper bundling and tree-shaking by Vite.
 */

// @ts-ignore - d3 v3 doesn't have TypeScript types
import d3 from './vendor/d3.v3.patched.js'

export default d3
