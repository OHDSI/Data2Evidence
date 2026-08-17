type AnyRouter = { stack: Array<Record<string, never>> };

function findRouteLayer(router: AnyRouter, method: string, path: string) {
  const layer = (router.stack as unknown as Array<{
    route?: {
      path: string;
      methods: Record<string, boolean>;
      stack: Array<{ handle: unknown }>;
    };
  }>).find((l) => l.route?.path === path && l.route?.methods?.[method] === true);

  if (!layer?.route) {
    throw new Error(`No ${method.toUpperCase()} route registered at "${path}"`);
  }
  return layer.route;
}

/** Return the final handler for a route, skipping any validator middleware. */
export function findHandler(
  router: unknown,
  method: string,
  path: string,
): (req: unknown, res: unknown) => Promise<void> | void {
  const route = findRouteLayer(router as AnyRouter, method, path);
  const handlers = route.stack.map((s) => s.handle);
  return handlers[handlers.length - 1] as (
    req: unknown,
    res: unknown,
  ) => Promise<void>;
}

/** Return the full middleware chain for a route, validators included. */
export function findHandlerChain(
  router: unknown,
  method: string,
  path: string,
): Array<(req: unknown, res: unknown, next: unknown) => Promise<void> | void> {
  const route = findRouteLayer(router as AnyRouter, method, path);
  return route.stack.map((s) => s.handle) as Array<
    (req: unknown, res: unknown, next: unknown) => Promise<void>
  >;
}
