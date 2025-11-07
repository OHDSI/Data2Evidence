export const getPortalAPI = (): {
  getAuthToken: () => Promise<string | void>
  browserBaseUrl: string
  backToJobs: () => void
} => {
  const portalApiNode = document.getElementById('jobs-main') as any
  if (portalApiNode) {
    return portalApiNode.portalAPI
  }
  throw new Error(`Portal API node is not present`)
}
