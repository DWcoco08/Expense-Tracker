import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@expense/shared'
import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH)
    .regex(/[A-Za-z]/, 'password_needs_letter')
    .regex(/[0-9]/, 'password_needs_digit'),
})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
