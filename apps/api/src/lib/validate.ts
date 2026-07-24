import { AppError } from '@expense/shared'
import { zValidator as honoZValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodType } from 'zod'

// Bọc lại @hono/zod-validator để lỗi kiểm tra đầu vào luôn ra đúng khuôn
// envelope trong api.md, thay vì khuôn mặc định {success:false,...} của thư viện.
export function zValidator<Target extends keyof ValidationTargets, T extends ZodType>(
  target: Target,
  schema: T,
) {
  return honoZValidator(target, schema, (result) => {
    if (!result.success) {
      throw new AppError('VALIDATION', 'validation_failed', { issues: result.error.issues })
    }
  })
}
