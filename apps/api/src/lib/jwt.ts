import { ACCESS_TOKEN_TTL_MS } from '@expense/shared'
import { Jwt } from 'hono/utils/jwt'

export async function signAccessToken(userId: string, secret: string): Promise<string> {
  const exp = Math.floor((Date.now() + ACCESS_TOKEN_TTL_MS) / 1000)
  return Jwt.sign({ sub: userId, exp }, secret)
}

// Ném lỗi khi token hết hạn, sai chữ ký hoặc sai định dạng — gọi nơi khác bắt chung.
export async function verifyAccessToken(token: string, secret: string): Promise<string> {
  const payload = await Jwt.verify(token, secret, 'HS256')
  if (typeof payload.sub !== 'string') throw new Error('invalid_token_subject')
  return payload.sub
}
