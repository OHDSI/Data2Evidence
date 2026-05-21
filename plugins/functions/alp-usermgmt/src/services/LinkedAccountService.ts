import { Inject, Service } from 'typedi'
import { randomBytes, createHash } from 'crypto'
import { Buffer } from 'buffer'
import { v4 as uuidv4 } from 'uuid'
import { PhysionetAPI, PhysionetHttpError } from '../api/PhysionetAPI'
import { LinkedAccountRepository } from '../repositories/LinkedAccountRepository'
import { OauthStateRepository } from '../repositories/OauthStateRepository'
import { encryptToken, decryptToken } from '../utils/crypto'
import { LinkedAccount } from '../entities'

export interface LinkedAccountServiceConfig {
  encryptionKey: string
  stateTtlSeconds: number
  refreshSkewSeconds: number
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = b64url(randomBytes(48))
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

@Service()
export class LinkedAccountService {
  constructor(
    private readonly api: PhysionetAPI,
    private readonly stateRepo: OauthStateRepository,
    private readonly linkedRepo: LinkedAccountRepository,
    @Inject('LINKED_ACCOUNT_CONFIG') private readonly cfg: LinkedAccountServiceConfig,
  ) {}

  async startLink(userId: string, provider: 'physionet'): Promise<{ url: string }> {
    const state = b64url(randomBytes(24))
    const { verifier, challenge } = generatePkce()
    await this.stateRepo.create({
      id: uuidv4(),
      userId,
      provider,
      state,
      codeVerifier: verifier,
      expiresAt: new Date(Date.now() + this.cfg.stateTtlSeconds * 1000),
    })
    return { url: this.api.buildAuthorizeUrl({ state, codeChallenge: challenge }) }
  }

  async handleCallback(p: { state: string; code: string }): Promise<LinkedAccount> {
    const stateRow = await this.stateRepo.consume(p.state)
    if (!stateRow) throw new Error('invalid or expired state')

    const tokens = await this.api.exchangeCode({ code: p.code, codeVerifier: stateRow.codeVerifier })
    const userinfo = await this.api.userinfo(tokens.accessToken)

    return await this.linkedRepo.upsert({
      id: uuidv4(),
      user_id: stateRow.userId,
      provider: stateRow.provider,
      provider_subject: userinfo.sub,
      provider_username: typeof userinfo.username === 'string' ? userinfo.username : null,
      access_token_enc: Buffer.from(encryptToken(tokens.accessToken, this.cfg.encryptionKey), 'base64'),
      refresh_token_enc: tokens.refreshToken
        ? Buffer.from(encryptToken(tokens.refreshToken, this.cfg.encryptionKey), 'base64')
        : null,
      access_token_expires: new Date(Date.now() + tokens.expiresIn * 1000),
      scopes: tokens.scope,
    })
  }

  async getDecryptedAccessToken(userId: string, provider: 'physionet'): Promise<string | null> {
    const acc = await this.linkedRepo.findByUserAndProvider(userId, provider)
    if (!acc) return null
    const currentToken = () => decryptToken(acc.accessTokenEnc.toString('base64'), this.cfg.encryptionKey)
    // No expiry recorded → we have no evidence the token is stale; don't auto-refresh.
    if (!acc.accessTokenExpires) return currentToken()
    const needsRefresh = acc.accessTokenExpires.getTime() - this.cfg.refreshSkewSeconds * 1000 < Date.now()
    if (!needsRefresh) return currentToken()
    if (!acc.refreshTokenEnc) return null
    const rt = decryptToken(acc.refreshTokenEnc.toString('base64'), this.cfg.encryptionKey)
    try {
      const tokens = await this.api.refresh(rt)
      await this.linkedRepo.upsert({
        id: acc.id,
        user_id: acc.userId,
        provider: acc.provider,
        provider_subject: acc.providerSubject,
        provider_username: acc.providerUsername,
        access_token_enc: Buffer.from(encryptToken(tokens.accessToken, this.cfg.encryptionKey), 'base64'),
        refresh_token_enc: tokens.refreshToken
          ? Buffer.from(encryptToken(tokens.refreshToken, this.cfg.encryptionKey), 'base64')
          : acc.refreshTokenEnc,
        access_token_expires: new Date(Date.now() + tokens.expiresIn * 1000),
        scopes: tokens.scope ?? acc.scopes,
      })
      return tokens.accessToken
    } catch (e) {
      if (e instanceof PhysionetHttpError && !e.transient) return null
      throw e
    }
  }

  async unlink(userId: string, provider: 'physionet'): Promise<void> {
    const acc = await this.linkedRepo.findByUserAndProvider(userId, provider)
    if (!acc) return
    try {
      const at = decryptToken(acc.accessTokenEnc.toString('base64'), this.cfg.encryptionKey)
      await this.api.revoke(at)
    } catch { /* best-effort */ }
    if (acc.refreshTokenEnc) {
      try {
        const rt = decryptToken(acc.refreshTokenEnc.toString('base64'), this.cfg.encryptionKey)
        await this.api.revoke(rt)
      } catch { /* best-effort */ }
    }
    await this.linkedRepo.deleteById(acc.id)
  }

  async list(userId: string): Promise<Array<{ provider: string; username: string | null; lastSyncedAt: Date | null; lastSyncError: string | null }>> {
    const acc = await this.linkedRepo.findByUserAndProvider(userId, 'physionet')
    if (!acc) return []
    return [{ provider: acc.provider, username: acc.providerUsername, lastSyncedAt: acc.lastSyncedAt, lastSyncError: acc.lastSyncError }]
  }
}
