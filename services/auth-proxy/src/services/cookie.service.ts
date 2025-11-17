import type { AuthCookiePayload } from '../types/index.ts';

function encodeBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

function decodeBase64(data: string): Uint8Array {
  return Uint8Array.from(atob(data), c => c.charCodeAt(0));
}

const COOKIE_SECRET = Deno.env.get('COOKIE_SECRET') || 'change-this-secret';

async function getEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(COOKIE_SECRET.padEnd(32, '0').slice(0, 32));
  
  return await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export class CookieService {
  private async encrypt(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);
    
    return encodeBase64(combined);
  }
  
  private async decrypt(encryptedData: string): Promise<string> {
    try {
      const combined = decodeBase64(encryptedData);
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      
      const key = await getEncryptionKey();
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('[Cookie] Decrypt error:', error);
      throw new Error('Failed to decrypt cookie');
    }
  }
  
  async createAuthCookie(payload: AuthCookiePayload): Promise<string> {
    const data = JSON.stringify(payload);
    return await this.encrypt(data);
  }
  
  async parseAuthCookie(cookie: string): Promise<AuthCookiePayload | null> {
    try {
      const decrypted = await this.decrypt(cookie);
      return JSON.parse(decrypted) as AuthCookiePayload;
    } catch (error) {
      console.error('[Cookie] Parse error:', error);
      return null;
    }
  }
  
  isExpired(payload: AuthCookiePayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    const buffer = 5 * 60; // 5 minutes buffer
    return now >= (payload.expires_at - buffer);
  }
}
