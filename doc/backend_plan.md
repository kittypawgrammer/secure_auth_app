# Backend Plan: Secure Auth + MIS Dashboard

> **File**: `doc/plan.md` (backend)
> **Frontend plan**: `doc/frontend-plan.md`
> **Stack**: Next.js 16 Route Handlers, TypeScript, PostgreSQL, Prisma 7 (`@prisma/adapter-pg`), jose (JWT), bcrypt, Zod, exceljs, Nodemailer
> **Rule**: every check (login, admin, approval) happens on the server. The browser is never trusted.

---

## 1. What we are building

1. **Secure auth with admin approval**: users sign up, stay `PENDING`, and cannot log in until an admin approves them. The admin gets an email for each new signup.
2. **MIS dashboard**: the admin uploads the MIS Excel file. The server reads it into PostgreSQL. Approved users see it as a sheet and as a dashboard. Edits are made in the app, and the updated Excel can be downloaded.

### Excel flow (upload, no live sync)
```
Admin uploads .xlsx → server parses (exceljs) → saved in PostgreSQL
→ /sheet and /dashboard read from DB → edits saved to DB
→ "Download Excel" builds a fresh .xlsx from DB
→ Uploading again replaces that sheet's data
```
Edits made in Excel appear in the app only after the file is uploaded again.

---

## 2. Progress

| # | Step | Status |
|---|------|--------|
| 1 | Prisma `User` model + `AccountStatus` enum | ✅ Done |
| 2 | Admin seed script (`prisma/seed.ts`) | ✅ Done |
| 3 | JWT + cookie helpers (`lib/auth.ts`) | ✅ Done |
| 4 | `POST /api/auth/signup` | ✅ Done |
| 5 | `POST /api/auth/login` | ⬜ Next |
| 6 | `POST /api/auth/logout`, `GET /api/auth/me` | ⬜ |
| 7 | Admin user APIs (list / approve / reject / disable) | ⬜ |
| 8 | Approval emails (admin notified, user notified) | ⬜ |
| 9 | MIS database models | ⬜ |
| 10 | Excel upload + parse API | ⬜ |
| 11 | Sheet API (read + edit cells) | ⬜ |
| 12 | Dashboard API (KPIs, charts data) | ⬜ |
| 13 | Add column / add tab APIs | ⬜ |
| 14 | Download Excel API | ⬜ |

---

## 3. Folder structure (backend parts)

```
app/api/
├── auth/
│   ├── signup/route.ts            ✅ POST  register as PENDING
│   ├── login/route.ts             ⬜ POST  check password + status, set cookie
│   ├── logout/route.ts            ⬜ POST  clear cookie
│   └── me/route.ts                ⬜ GET   current user (safe fields)
├── admin/users/
│   ├── route.ts                   ⬜ GET   list users (?status=PENDING)
│   └── [id]/
│       ├── approve/route.ts       ⬜ PATCH approve
│       ├── reject/route.ts        ⬜ PATCH reject
│       └── status/route.ts        ⬜ PATCH disable / re-enable
└── mis/
    ├── upload/route.ts            ⬜ POST  upload .xlsx (admin)
    ├── sheets/route.ts            ⬜ GET list tabs, POST add tab (admin)
    ├── sheets/[id]/route.ts       ⬜ GET   rows + values for the sheet view
    ├── sheets/[id]/cells/route.ts ⬜ PATCH edit a value (admin/editor)
    ├── sheets/[id]/columns/route.ts ⬜ POST add custom column (admin)
    ├── dashboard/route.ts         ⬜ GET   KPIs + chart data (?period=month|quarter|ytd)
    └── export/route.ts            ⬜ GET   download .xlsx

lib/
├── auth.ts                        ✅ getCurrentUser, requireAuth, requireAdmin, createSession, destroySession
├── db/prisma.ts                   ✅ Prisma singleton
├── validation/                    ⬜ shared Zod schemas (auth, admin, mis)
├── email/mailer.ts                ⬜ Nodemailer transport + email templates
└── mis/
    ├── parse.ts                   ⬜ Excel → rows/values
    ├── calc.ts                    ⬜ totals, margins, %, variances, quarters, YTD
    └── export.ts                  ⬜ DB → Excel
```

> `lib/auth.ts` currently holds JWT, cookie and RBAC helpers in one file. We can split it into `lib/auth/*` later. That's not required.

---

## 4. Auth steps (5–8)

### Step 5: Login `POST /api/auth/login`
- Validate `{ email, password }` with Zod.
- Find the user by lowercase email, then `bcrypt.compare`.
- Wrong email or wrong password → **401** with one generic message (don't reveal which emails exist).
- `PENDING` → **403** "waiting for approval". `REJECTED` / `DISABLED` → **403** "not active".
- `APPROVED` → `createSession(user.id)` → **200** `{ isAdmin }`.

### Step 6: Logout + Me
- `logout`: `destroySession()` → 200.
- `me`: `getCurrentUser()`. Return null → 401, otherwise `{ id, name, email, is_admin, status }`. Never return `password_hash`.

### Step 7: Admin user APIs
- Every route starts with `requireAdmin()`. Not admin → 403.
- `GET /api/admin/users?status=PENDING` returns safe fields only.
- `approve`: set `status=APPROVED`, `approved_at=now()`, `approved_by_id=admin.id`.
- `reject`: set `status=REJECTED`.
- `status`: `{ status: "DISABLED" | "APPROVED" }`, validated with Zod.
- An admin cannot disable themselves.

### Step 8: Approval emails
- Add to `.env`: `SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, APP_URL`.
- On signup: email the admin(s) "New user X wants access" with a link to `/admin/users`.
- On approve / reject: email the user the result.
- **Optional, one-click approve from the email:** a signed JWT `{ sub: userId, purpose: "approve" }`, valid 24h, sent as a link to `GET /api/admin/approve?token=…`. The route verifies the token, then requires an admin to be logged in before approving.
- If sending fails, signup must still succeed. Log the error; don't block the user.

---

## 5. MIS steps (9–14)

### Step 9: Database models

The Excel is "wide" (one row per line item, with 5 columns for every month). In the DB we store it "long", so new months, tabs and columns don't need table changes.

```prisma
enum LineKind   { INPUT  FORMULA  PERCENT  HEADER }
enum Metric     { ACTUAL_LY  ACTUAL_CY  BUDGET }

model MisSheet {                     // one Excel tab
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @unique       // "Mobility & Beyond"
  fiscal_year String                 // "2026-27"
  sort_order  Int      @default(0)
  lines       MisLine[]
  columns     MisColumn[]
  uploaded_by_id String? @db.Uuid
  updated_at  DateTime @updatedAt @db.Timestamptz(3)
}

model MisLine {                      // one row: "Revenue", "Rent and utility"…
  id         String   @id @default(uuid()) @db.Uuid
  sheet_id   String   @db.Uuid
  sheet      MisSheet @relation(fields: [sheet_id], references: [id], onDelete: Cascade)
  label      String
  kind       LineKind @default(INPUT)
  is_cost    Boolean  @default(false) // flips variance sign
  formula    String?                  // e.g. "TOTAL_INCOME-EMPLOYEE_DELIVERY"
  key        String?                  // stable code, e.g. "REVENUE"
  sort_order Int
  values     MisValue[]
  @@unique([sheet_id, label])
}

model MisValue {                     // one number: Revenue / Apr-26 / Budget
  id       String  @id @default(uuid()) @db.Uuid
  line_id  String  @db.Uuid
  line     MisLine @relation(fields: [line_id], references: [id], onDelete: Cascade)
  month    DateTime @db.Date          // first day of month
  metric   Metric
  value    Decimal @db.Decimal(18, 2)
  @@unique([line_id, month, metric])
}

model MisColumn {                    // custom column added from the UI
  id       String @id @default(uuid()) @db.Uuid
  sheet_id String @db.Uuid
  sheet    MisSheet @relation(fields: [sheet_id], references: [id], onDelete: Cascade)
  name     String
  type     String @default("text")    // text | number
  cells    MisCustomCell[]
}

model MisCustomCell {
  id        String @id @default(uuid()) @db.Uuid
  column_id String @db.Uuid
  column    MisColumn @relation(fields: [column_id], references: [id], onDelete: Cascade)
  line_id   String @db.Uuid
  value     String
  @@unique([column_id, line_id])
}
```

**What is stored and what is calculated**
- Stored: only INPUT values (Revenue, Employee Cost, Rent…), per month × metric.
- Calculated in `lib/mis/calc.ts`: totals, margins, % rows, variances, quarters, YTD.
  - Variance vs budget: income rows `CY − Budget`, cost rows `Budget − CY`.
  - Variance vs LY: income rows `CY − LY`, cost rows `LY − CY`.
  - Division by 0 → `null` (shown as "–" in the UI).
- Why: one source of truth. If Revenue changes, every margin updates automatically.

### Step 10: Upload `POST /api/mis/upload` (admin)
- `multipart/form-data` with a `.xlsx`. Check the extension, MIME type and size (≤ 5 MB).
- `exceljs` reads each worksheet → find the header rows (month title row + metric row) → map columns to `{ month, metric }`.
- Each row with a label in column A becomes a `MisLine`. Formula cells and % rows are marked FORMULA/PERCENT, and their values are not stored.
- Save inside one `prisma.$transaction`: delete the old lines for that sheet, then insert the new ones. Half an upload never gets saved.
- Return a summary: `{ sheets, lines, values, warnings[] }`.

### Step 11: Sheet API
- `GET /api/mis/sheets/[id]` → rows with every month's 5 columns (LY, CY, Budget, Var B, Var LY) plus Q1–Q4 and YTD, already calculated. The grid only displays.
- `PATCH /api/mis/sheets/[id]/cells` `{ lineId, month, metric, value }` → only INPUT lines, admin (later: editor role). Upsert into `MisValue`.

### Step 12: Dashboard API `GET /api/mis/dashboard?sheet=&period=month|quarter|ytd&month=`
Returns:
- KPI cards: Revenue, Contribution Margin, Gross Margin, EBITDA ($ and %), each with vs Budget and vs LY.
- Bar data: Actual vs Budget vs LY by month.
- Trend: EBITDA % and GM % by month.
- Expense breakdown: indirect expense lines for the selected period.
- Variance table: biggest over/under-budget lines.

### Step 13: Add column / tab
- `POST /api/mis/sheets` `{ name, fiscal_year }` → a new empty tab.
- `POST /api/mis/sheets/[id]/columns` `{ name, type }` → a custom column. Cells are edited through `PATCH …/columns/[colId]/cells`.

### Step 14: Download `GET /api/mis/export?sheet=`
- Build the workbook with `exceljs` in the same layout as the original (title rows, month headers, 5 sub-columns, quarters, YTD, plus custom columns at the end).
- Write real Excel formulas for the calculated rows, so the file still works when edited in Excel.
- Response headers: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="MIS.xlsx"`.

---

## 6. Roles (later upgrade)
`is_admin` is enough to start. When editors are needed, replace it with `enum Role { ADMIN EDITOR VIEWER }`:
- VIEWER: view sheet + dashboard
- EDITOR: + edit cells
- ADMIN: + upload, add tab/column, approve users

## 7. Security checklist
- Zod on every request body and query.
- `requireAdmin()` / `requireAuth()` as the first line of every protected route.
- The DB status is checked on every request (already in `getCurrentUser`).
- Upload: size + type limits, never run macros, never trust cell formulas from the file.
- Secrets only in `.env`. Update `.env.example` with placeholder names.
