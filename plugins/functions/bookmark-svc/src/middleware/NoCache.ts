/**
 * express middleware to disable browser caching (otherwise at least IE is caching the response).
 */
export default (req, res, next) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  res.header('Expires', '-1')
  res.header('Pragma', 'no-cache')
  next()
}
