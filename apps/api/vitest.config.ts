import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig(async () => {
  const migrationsPath = path.join(import.meta.dirname, '../../packages/db/migrations')
  const migrations = await readD1Migrations(migrationsPath)

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          // JWT_SECRET/PASSWORD_PEPPER/... chỉ có trong .dev.vars cục bộ (gitignore, mỗi
          // máy tự tạo) — CI không có file đó nên phải cấp giá trị test riêng ở đây để
          // môi trường test giống nhau trên mọi máy, không phụ thuộc .dev.vars có hay không.
          bindings: {
            TEST_MIGRATIONS: migrations,
            JWT_SECRET: 'test-jwt-secret',
            PASSWORD_PEPPER: 'test-password-pepper',
            ENVIRONMENT: 'test',
            APP_VERSION: 'test',
            GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
          },
        },
      }),
    ],
    test: {
      setupFiles: ['./test/apply-migrations.ts'],
      coverage: {
        provider: 'istanbul',
        include: ['src/**'],
      },
    },
  }
})
