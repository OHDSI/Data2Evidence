const USE_MOCK_SERVER = false
const REDIRECT_URL = 'https://localhost:8081'

const config = {
  // Update client_id to your LOGTO__ALP_APP__CLIENT_ID
  client_id: '1d6wuydanyaiypbkchxzu',
  redirect_uri: REDIRECT_URL,
  authority: 'https://localhost:41100',
  metadata: {
    issuer: 'https://localhost:8081/oidc',
    authorization_endpoint: 'https://localhost:8081/oidc/auth',
    token_endpoint: 'https://localhost:8081/oauth/token',
    end_session_endpoint:
      // Update client_id to your LOGTO__ALP_APP__CLIENT_ID
      'https://localhost:8081/oidc/session/end?client_id=1d6wuydanyaiypbkchxzu&redirect={window.location.origin}/portal',
    revocation_endpoint: 'https://localhost:8081/oidc/token/revocation',
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
