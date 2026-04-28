import { Logger } from 'winston'

export const setupGlobalErrorHandling = (app: any, log: Logger) => {
  // global error handler
  app.use((err, req, res, next) => {
    log.error(err.message)
    log.error(err.stack)
    res.status(500).json(err.message)
  })
}
