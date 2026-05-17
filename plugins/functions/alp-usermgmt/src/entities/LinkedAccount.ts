export interface LinkedAccount {
  id: string
  userId: string
  provider: string
  providerSubject: string
  providerUsername: string | null
  accessTokenEnc: Buffer
  refreshTokenEnc: Buffer | null
  accessTokenExpires: Date | null
  scopes: string | null
  linkedAt: Date
  updatedAt: Date
  lastSyncedAt: Date | null
  lastSyncError: string | null
}
