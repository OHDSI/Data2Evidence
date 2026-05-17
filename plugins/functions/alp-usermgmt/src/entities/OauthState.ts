export interface OauthState {
  id: string
  userId: string
  provider: string
  state: string
  codeVerifier: string
  expiresAt: Date
  createdAt: Date
}
