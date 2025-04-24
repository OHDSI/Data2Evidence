export const getPortalAPI = (): {
  getToken
  qeSvcUrl?: string
  studyId?: string
  releaseId?: string
  username?: string
  toggleAtlas?(val: boolean, path: string): void
} => {
  if (document.getElementsByClassName('plugin-container').length === 1) {
    return (document.getElementsByClassName('plugin-container')[0] as any).portalAPI
  }
  return null
}
