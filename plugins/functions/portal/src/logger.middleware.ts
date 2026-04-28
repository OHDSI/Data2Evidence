import { HttpContext, Logger, NextFunction } from '@danet/core';

const logger = new Logger('Logger');

export const loggerMiddleware = async (
  ctx: HttpContext,
  next: NextFunction,
) => {
  logger.log(`${ctx.req.method} - ${ctx.req.routePath}`);
  return await next();
};
