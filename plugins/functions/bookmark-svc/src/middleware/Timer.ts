import { Logger } from '@alp/alp-base-utils'
const log = Logger.CreateLogger('bookmark-log')

/**
 * express middleware to measures and logs endpoint execution duration (in ms).
 * @param urlToCheck: array of routes. e.g.    [
        "/patient",
        "/analytics-svc/pa/services/analytics.xsjs?action=patientdetail",
    ]
 */
export default (
    urlToCheck: string[] = [],
    urlToIgnore: string[] = ['/analytics-svc/pa/ui/', '/hc/hph/patient/app/ui/']
  ) =>
  (req, res, next) => {
    if (urlToIgnore.filter(prefix => req.originalUrl.indexOf(prefix) > -1).length > 0) {
      return next()
    }
    if (urlToCheck.indexOf(req.originalUrl) > -1 || urlToCheck.length === 0) {
      let start = Date.now()
      res.on('finish', () => {
        let duration = Date.now() - start
        log.info(`${req.originalUrl} : ${duration}ms`)
      })
    }
    next()
  }
