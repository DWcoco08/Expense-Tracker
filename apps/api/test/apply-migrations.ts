import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

// Setup files chạy ngoài phạm vi cô lập storage của từng test file và có thể
// chạy nhiều lần — applyD1Migrations() chỉ áp dụng migration chưa chạy nên gọi
// lại ở đây an toàn.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
