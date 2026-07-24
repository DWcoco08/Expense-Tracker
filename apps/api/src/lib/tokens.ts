import { bytesToBase64, bytesToHex } from './base64'

const REFRESH_TOKEN_BYTES = 32

export function generateRefreshToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(REFRESH_TOKEN_BYTES))
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

// Chỉ lưu hash trong sessions.token_hash — token gốc không bao giờ chạm DB.
export async function hashRefreshToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return bytesToHex(new Uint8Array(digest))
}
