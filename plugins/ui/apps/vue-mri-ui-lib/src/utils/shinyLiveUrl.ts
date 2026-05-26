export function buildShinyLiveDashboardUrl(
  resourceId: string,
  pathname = window.location.pathname
): string {
  const gatewayBase = pathname.startsWith('/d2e/') ? '/d2e/gateway' : '/gateway'
  return `${gatewayBase}/api/dataset/shiny-live/${resourceId}/`
}
