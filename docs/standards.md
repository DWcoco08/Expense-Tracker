# Quy chuẩn mã nguồn

---

## 1. Đặt tên

| Đối tượng | Kiểu | Ví dụ |
|---|---|---|
| Tên tệp | kebab-case | `wallet-form.tsx` |
| Thư mục module | Danh từ số nhiều | `wallets/` |
| Biến, hàm | camelCase | `computeBalance()` |
| Kiểu, component React | PascalCase | `WalletSummary` |
| Hằng số | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |
| Cột cơ sở dữ liệu | snake_case | `initial_balance` |
| Trường JSON của API | camelCase | `initialBalance` |

Cơ sở dữ liệu dùng snake_case, API dùng camelCase; chuyển đổi do Drizzle đảm nhiệm. Hai quy ước không trộn lẫn trong cùng một tầng.

---

## 2. TypeScript

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "forceConsistentCasingInFileNames": true,
  "verbatimModuleSyntax": true,
  "isolatedModules": true
}
```

`noUncheckedIndexedAccess` buộc kiểm tra `undefined` khi truy cập phần tử mảng, loại bỏ lỗi truy cập `rows[0]` trên tập kết quả rỗng.

Không dùng `any`; trường hợp chưa xác định kiểu dùng `unknown` và thu hẹp dần. Không dùng `as` để bỏ qua lỗi kiểu. Kiểu dùng chung khai báo tại `packages/shared`.

---

## 3. Khuôn module backend

Mỗi module trong `apps/api/src/modules/` gồm bốn tệp:

| Tệp | Trách nhiệm | Ràng buộc |
|---|---|---|
| `index.ts` | Khai báo route, kiểm tra đầu vào, gọi service | Thân xử lý 1–3 dòng, không chứa điều kiện nghiệp vụ |
| `model.ts` | Schema Zod cho yêu cầu và phản hồi | Nguồn định nghĩa duy nhất của hợp đồng dữ liệu |
| `repo.ts` | Truy vấn cơ sở dữ liệu | Không chứa quy tắc nghiệp vụ; mọi hàm nhận `userId` |
| `service.ts` | Quy tắc nghiệp vụ | Không import từ Hono, không tham chiếu HTTP |

```ts
// model.ts
export const createWalletSchema = z.object({
  name: z.string().trim().min(1).max(50),
  initialBalance: z.number().int().min(0),
  note: z.string().max(255).nullish(),
})
export type CreateWalletInput = z.infer<typeof createWalletSchema>

// service.ts
export async function createWallet(db: DB, userId: string, input: CreateWalletInput) {
  const existing = await repo.findByName(db, userId, input.name)
  if (existing) throw new AppError('DUPLICATE_NAME', 'wallet_name_taken')
  return repo.insert(db, userId, input)
}

// index.ts
export const wallets = new Hono<Env>()
  .post('/', zValidator('json', createWalletSchema), async (c) => {
    const wallet = await service.createWallet(c.get('db'), c.get('userId'), c.req.valid('json'))
    return c.json(wallet, 201)
  })
```

Module tham chiếu module khác bằng import hàm từ tầng service, không mount route của nhau. Tệp vượt 500 dòng phải tách; `service.ts` khi đó chuyển thành thư mục `service/`.

---

## 4. Lỗi và log

```ts
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown,
  ) { super(message) }
}
```

- Ném `AppError`, không tự dựng phản hồi lỗi trong tầng route
- Tham số `message` là mã định danh dạng máy đọc, ví dụ `wallet_name_taken`
- Lỗi không xác định do middleware trả `INTERNAL` 500 và ghi log; chi tiết lỗi không xuất hiện trong phản hồi
- Phía giao diện dùng một hàm `parseApiError()` duy nhất
- Log dạng `log.info({ event, userId, walletId, amount })`. Không ghi mật khẩu, token, email, ghi chú người dùng

---

## 5. Chú thích

Chú thích giải thích lý do, không mô tả thao tác.

```ts
// D1 không hỗ trợ kiểu DECIMAL nên giá trị tiền tệ lưu bằng số nguyên đơn vị đồng
const amount = Math.round(input.amount)
```

---

## 6. Git

Nhánh: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/` — ví dụ `feat/wallet-archive`.

Commit theo Conventional Commits, nội dung viết bằng tiếng Anh:

```
feat(wallets): add wallet archive endpoint
fix(transactions): correct balance when moving transaction between wallets
docs(srs): add acceptance criteria for FR-12
```

| Thành phần | Giá trị hợp lệ |
|---|---|
| Type | `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `style`, `chore` |
| Scope | `api`, `auth`, `users`, `wallets`, `categories`, `transactions`, `stats`, `budgets`, `recurring`, `notifications`, `web`, `db`, `shared`, `config`, `ci` |

Mỗi commit tương ứng một thay đổi có phạm vi xác định. Không thêm dòng đồng tác giả sinh bởi công cụ AI.

**Tài liệu cập nhật trong cùng commit với mã nguồn:** sửa endpoint → `api.md`; sửa lược đồ → `architecture.md`; sửa quy tắc nghiệp vụ → `srs.md`; hoàn thành hạng mục → `roadmap.md`.

---

## 7. Tiêu chí hoàn thành một chức năng

- Route có kiểm tra body và query
- Mọi truy vấn cơ sở dữ liệu lọc theo `user_id`
- Đã kiểm tra bằng tài khoản thứ hai: không truy cập được dữ liệu của tài khoản thứ nhất
- Lỗi phát sinh qua `AppError` với mã thuộc tập cố định
- Endpoint trả danh sách có khả năng tăng trưởng không giới hạn đã phân trang và giới hạn `limit`
- Giao diện có đủ trạng thái đang tải, rỗng, lỗi
- Toàn bộ tiêu chí chấp nhận tương ứng trong `srs.md` đã được kiểm chứng
- Tài liệu cập nhật trong cùng commit
- `bun run lint` và `bun run typecheck` không phát sinh cảnh báo
