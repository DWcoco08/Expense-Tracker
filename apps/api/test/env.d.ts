import type { Env as AppEnv } from '../src/types'

// File này có `import` nên TS coi là module — namespace bên trong không tự merge
// vào global trừ khi bọc trong `declare global` (khác với ambient script thường).
declare global {
  namespace Cloudflare {
    interface Env extends AppEnv {
      // Chỉ tồn tại trong môi trường test, dùng để apply-migrations.ts nạp migration — xem vitest.config.ts
      TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
    }
  }
}
