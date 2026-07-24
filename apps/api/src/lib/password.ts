import { base64ToBytes, bytesToBase64 } from './base64'

const PBKDF2_ITERATIONS = 210_000
const HASH_BITS = 256
const SALT_BYTES = 16

async function deriveBits(
  password: string,
  pepper: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password + pepper),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    HASH_BITS,
  )
  return new Uint8Array(bits)
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

// Định dạng lưu trữ: pbkdf2$sha256$<vòng lặp>$<salt base64>$<hash base64>
export async function hashPassword(password: string, pepper: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await deriveBits(password, pepper, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`
}

export async function verifyPassword(
  password: string,
  pepper: string,
  stored: string,
): Promise<boolean> {
  const [scheme, algorithm, iterationsRaw, saltB64, hashB64] = stored.split('$')
  if (scheme !== 'pbkdf2' || algorithm !== 'sha256' || !iterationsRaw || !saltB64 || !hashB64) {
    return false
  }

  const iterations = Number(iterationsRaw)
  if (!Number.isInteger(iterations) || iterations <= 0) return false

  const salt = base64ToBytes(saltB64)
  const expected = base64ToBytes(hashB64)
  const actual = await deriveBits(password, pepper, salt, iterations)
  return timingSafeEqual(actual, expected)
}
