// For local development only, production uses another authenticate.js in the resources folder.

// Get configuration from environment variables injected in index.html
const AUTH_CONFIG = window.AUTH_CONFIG || {}
const USE_MOCK_SERVER = AUTH_CONFIG.useMockServer || false
const REDIRECT_URL = AUTH_CONFIG.redirectUrl || 'https://localhost:8081'
const CLIENT_ID = AUTH_CONFIG.clientId || 'ALOjB8OcP85tw2ZQb33aH'

const config = {
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URL,
  authority: AUTH_CONFIG.authority || 'https://localhost:41100',
  metadata: {
    issuer: AUTH_CONFIG.issuer || 'https://localhost:8081/oidc',
    authorization_endpoint: AUTH_CONFIG.authEndpoint || 'https://localhost:8081/oidc/auth',
    token_endpoint: AUTH_CONFIG.tokenEndpoint || 'https://localhost:8081/oauth/token',
    end_session_endpoint: AUTH_CONFIG.endSessionEndpoint
      ? `${AUTH_CONFIG.endSessionEndpoint}?client_id=${CLIENT_ID}&redirect={window.location.origin}/portal`
      : `https://localhost:8081/oidc/session/end?client_id=${CLIENT_ID}&redirect={window.location.origin}/portal`,
    revocation_endpoint: AUTH_CONFIG.revocationEndpoint || 'https://localhost:8081/oidc/token/revocation',
  },
  scope: 'openid offline',
}

const userManager = new oidc.UserManager(config)
const urlParams = new URLSearchParams(window.location.search)
const code = urlParams.get('code')
const authToken = localStorage.getItem('msaltoken')

const signinRedirect = async () => {
  await userManager.signinRedirect()
}

// This is not used in code, but can be accessed in the browser when developing using `await getUser()`
const getUser = () => {
  return userManager.getUser()
}

const isTokenExpired = token => {
  if (!token) return true

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const expirationTime = payload.exp * 1000 // Convert to milliseconds
    return Date.now() >= expirationTime
  } catch (error) {
    console.error('Error parsing token', error)
    return true
  }
}

// This is not used in this file, so it is marked unused, however it is used in index.html
const logoutfn = () => {
  localStorage.removeItem('msaltoken')
  userManager.signoutRedirect({
    id_token_hint: userManager.getUser()?.access_token,
  })
}

if (!USE_MOCK_SERVER) {
  if (code) {
    userManager
      .signinRedirectCallback()
      .then(user => {
        localStorage.setItem('msaltoken', user.access_token)
        const returnPath = sessionStorage.getItem('returnPath') || '/'
        sessionStorage.removeItem('returnPath')
        window.location.replace(window.location.origin + returnPath)
      })
      .catch(error => {
        console.error('Error during login', error)
        localStorage.removeItem('msaltoken')
        signinRedirect()
      })
  } else if (!authToken || isTokenExpired(authToken)) {
    if (authToken && isTokenExpired(authToken)) {
      console.log('Token expired, redirecting to sign in')
      localStorage.removeItem('msaltoken')
    }
    sessionStorage.setItem('returnPath', window.location.pathname)
    signinRedirect()
  }
}
