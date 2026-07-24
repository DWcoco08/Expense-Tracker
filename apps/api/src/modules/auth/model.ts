import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@expense/shared'
import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH)
    .regex(/[A-Za-z]/, 'password_needs_letter')
    .regex(/[0-9]/, 'password_needs_digit'),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof loginSchema>
