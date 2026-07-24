import { ACCESS_TOKEN_TTL_MS } from '@expense/shared'
import { Jwt } from 'hono/utils/jwt'

export interface AccessTokenClaims {
  userId: string
  sessionId: string
}

// sid tham chiếu sessions.id — dùng để xác định "phiên hiện tại" khi cần thu hồi
// các phiên khác (đổi mật khẩu, FR-05) mà không phải dựa vào cookie rt, vì rt có
// Path=/v1/auth nên không được gửi kèm tới các route khác như /v1/me/password.
export async function signAccessToken(claims: AccessTokenClaims, secret: string): Promise<string> {
  const exp = Math.floor((Date.now() + ACCESS_TOKEN_TTL_MS) / 1000)
  return Jwt.sign({ sub: claims.userId, sid: claims.sessionId, exp }, secret)
}

// Ném lỗi khi token hết hạn, sai chữ ký hoặc sai định dạng — gọi nơi khác bắt chung.
export async function verifyAccessToken(token: string, secret: string): Promise<AccessTokenClaims> {
  const payload = await Jwt.verify(token, secret, 'HS256')
  if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
    throw new Error('invalid_token_claims')
  }
  return { userId: payload.sub, sessionId: payload.sid }
}
