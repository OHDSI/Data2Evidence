import { serveStatic } from "npm:hono/deno";
import { env, global, logger } from "../env.ts";
import { Hono, Context } from "npm:hono";

function _addStatic(app: Hono, url: string, path: string) {
  logger.log(url + "   " + path);
  app.use(
    url + "/*",
    serveStatic({
      root: path,
      rewriteRequestPath: (path: string) => {
        if (path == "/portal/login-callback") return "";
        else return path.replace(new RegExp(`^${url}`), "");
      },
      onNotFound: (path: string, c: Context) => {
        logger.log(`${path} is not found, you access ${c.req.path}`);
      },
    })
  );
}

export function addPlugin(app: Hono, value: any, dir: string) {
  if (value.routes)
    value.routes.forEach((r: any) => {
      _addStatic(app, `${r.source}`, `${dir}${r.target}/`);
    });
  app.get("/", (c) => {
    return c.redirect(`/portal/`);
  });
  app.use(
    "/portal/login",
    serveStatic({ path: `${dir}resources/portal/index.html` })
  );
  app.use(
    "/portal/researcher/*",
    serveStatic({ path: `${dir}resources/portal/index.html` })
  );
  app.use(
    "/portal/systemadmin/*",
    serveStatic({ path: `${dir}resources/portal/index.html` })
  );
  if (value.uiplugins) {
    global.PLUGINS_JSON = updatePluginJson(
      JSON.parse(global.PLUGINS_JSON),
      value.uiplugins
    );
    console.log(global.PLUGINS_JSON);
  }
}

/**
 * Merges children from an incoming item into an existing item, preserving existing children
 * and updating them if they have the same route.
 *
 * @param existingItem The existing parent item
 * @param incomingItem The incoming parent item with children to merge
 */
export function mergeChildren(existingItem: any, incomingItem: any): void {
  // Only proceed if incoming item has children
  if (!incomingItem.children || !Array.isArray(incomingItem.children)) {
    return;
  }

  // Create or ensure there's a children array in the existing item
  if (!existingItem.children) {
    existingItem.children = [];
  }

  // Create a map of existing children by route for efficient lookup
  const existingChildrenByRoute = new Map<string, any>();
  existingItem.children.forEach((child: any) => {
    if (child.route) {
      existingChildrenByRoute.set(child.route, child);
    }
  });

  // Process each incoming child
  incomingItem.children.forEach((incomingChild: any) => {
    if (!incomingChild.route) return;

    if (existingChildrenByRoute.has(incomingChild.route)) {
      // Update existing child with incoming properties
      Object.assign(
        existingChildrenByRoute.get(incomingChild.route),
        incomingChild
      );
    } else {
      // Add new child to existing children array
      existingItem.children.push(incomingChild);
    }
  });
}

/**
 * Merges an incoming plugin item into an existing one, handling both the item properties
 * and any nested children.
 *
 * @param existingItem The existing item to update
 * @param incomingItem The incoming item with new data
 */
export function mergePluginItem(existingItem: any, incomingItem: any): void {
  // First handle any children if they exist
  if (incomingItem.children && Array.isArray(incomingItem.children)) {
    mergeChildren(existingItem, incomingItem);
  }

  // Save reference to existing children
  const existingChildren = existingItem.children;

  // Update all other properties from incoming item
  Object.assign(existingItem, incomingItem);

  // Restore children that we processed
  if (existingChildren) {
    existingItem.children = existingChildren;
  }
}

/**
 * Updates the plugins JSON by merging new plugin data, preserving existing data
 * where appropriate and handling nested structures.
 *
 * @param plugins The existing plugins object
 * @param uiPlugins New plugins to merge in
 * @returns JSON string with merged plugins and environment variables substituted
 */
export function updatePluginJson(plugins: any, uiPlugins: any): string {
  for (const [key, value] of Object.entries(uiPlugins)) {
    const pluginArray = value as any[];

    if (plugins[key]) {
      // Create a map for easy access to existing items by route
      const existingItemsByRoute = new Map<string, any>();
      plugins[key].forEach((item: any) => {
        if (item.route) {
          existingItemsByRoute.set(item.route, item);
        }
      });

      // Process each incoming item
      pluginArray.forEach((incomingItem: any) => {
        const route = incomingItem.route;
        if (!route) return;

        // If this route already exists in plugins
        if (existingItemsByRoute.has(route)) {
          const existingItem = existingItemsByRoute.get(route);
          mergePluginItem(existingItem, incomingItem);
        } else {
          // If this route doesn't exist, simply add the incoming item
          plugins[key].push(incomingItem);
        }
      });
    } else {
      // If key doesn't exist, just add the new value
      plugins[key] = pluginArray;
    }
  }

  // Convert to string and replace any placeholders
  return JSON.stringify(plugins).replace(
    /\$\$FQDN\$\$/g,
    env.CADDY__ALP__PUBLIC_FQDN
  );
}
