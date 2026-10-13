# Frontend Plan: Next.js UI

> **File**: `doc/frontend-plan.md`
> **Backend plan**: `doc/plan.md`
> **Same project**: the frontend lives in the same Next.js app as the APIs (`app/` pages + `app/api/` routes). No separate React app.
> **Stack**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 (already installed), SWR (data fetching), AG Grid Community (sheet), Recharts (charts)

---

## 1. Key ideas

| Idea | What it means here |
|------|--------------------|
| **Server Component** (default) | Runs on the server. Can call `getCurrentUser()` and Prisma directly. Used for page shells and access checks. |
| **Client Component** (`"use client"`) | Runs in the browser. Needed for forms, buttons, state, charts and the grid. |
| **Route group** `(name)` | A folder in brackets groups pages and shares a layout **without** changing the URL. `app/(auth)/login` → `/login`. |
| **Layout** | Wraps every page in its folder. The protected layout checks the user once for all pages inside it. |
| **proxy.ts** (Next 16, formerly `middleware.ts`) | Runs before a page loads. Used only for a quick "is there a cookie?" redirect. The real check is still on the server. |

**Security rule:** hiding a button is not security. Every page re-checks on the server, and every API checks again.

---

## 2. Pages

| URL | Who | Purpose |
|-----|-----|---------|
| `/` | everyone | Redirect: logged in → `/dashboard`, else `/login` |
| `/signup` | public | Register form → "wait for approval" message |
| `/login` | public | Login form. 403 pending → `/pending` |
| `/pending` | public | "Your account is waiting for admin approval" |
| `/dashboard` | approved | KPI cards + charts |
| `/sheet` | approved | Excel-like grid of the MIS sheet, tabs on top |
| `/admin/users` | admin | Pending / approved / rejected lists, Approve / Reject buttons |
| `/admin/upload` | admin | Upload `.xlsx`, see the import summary |

---

## 3. Folder structure

```
app/
├── layout.tsx                    root: fonts, globals.css
├── page.tsx                      redirect to /dashboard or /login
├── proxy.ts  (at project root)   cookie check → redirect to /login
├── (auth)/                       public pages, centered card layout
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx           (move the existing app/signup here; URL stays /signup)
│   └── pending/page.tsx
└── (protected)/                  logged-in pages
    ├── layout.tsx                getCurrentUser() → redirect('/login') if null; navbar + sidebar
    ├── dashboard/page.tsx
    ├── sheet/page.tsx
    └── admin/
        ├── layout.tsx            requireAdmin() → redirect('/dashboard') if not admin
        ├── users/page.tsx
        └── upload/page.tsx

components/
├── ui/                           Button, Input, Card, Badge, Alert, Spinner
├── auth/
│   ├── SignupForm.tsx            "use client"
│   ├── LoginForm.tsx             "use client"
│   └── LogoutButton.tsx          "use client"
├── layout/
│   ├── Navbar.tsx                user name, logout
│   └── Sidebar.tsx               Dashboard, Sheet, (admin) Users, Upload
├── admin/
│   ├── UsersTable.tsx            "use client", approve/reject buttons
│   └── UploadForm.tsx            "use client", file input + progress + summary
├── sheet/
│   ├── SheetTabs.tsx             switch tabs, "+ Add tab"
│   ├── MisGrid.tsx               AG Grid, grouped month headers, pinned first column
│   └── AddColumnDialog.tsx
└── dashboard/
    ├── PeriodFilter.tsx          Month / Quarter / YTD
    ├── KpiCard.tsx               value, vs Budget, vs LY (green/red)
    ├── ActualBudgetChart.tsx     bar: Actual vs Budget vs LY
    ├── MarginTrendChart.tsx      line: EBITDA %, GM %
    ├── ExpenseBreakdown.tsx      bar/pie of indirect expenses
    └── VarianceTable.tsx

lib/
├── api-client.ts                 small fetch wrapper (JSON, error message)
└── format.ts                     money, %, "–" for null
```

---

## 4. Steps (each step = build one API, then its page)

| # | Frontend step | Needs backend step | Status |
|---|---------------|--------------------|--------|
| F1 | Base UI: `(auth)` layout + `ui/Button`, `Input`, `Card`, `Alert` | – | ⬜ Next |
| F2 | Signup page + `SignupForm` | Signup ✅ | ⬜ |
| F3 | Login page + `LoginForm`, pending page | Login (5) | ⬜ |
| F4 | `(protected)` layout, Navbar, Logout, `proxy.ts`, `/` redirect | Logout + Me (6) | ⬜ |
| F5 | Admin users page | Admin APIs (7) | ⬜ |
| F6 | (no UI) emails | Emails (8) | ⬜ |
| F7 | Admin upload page | MIS models + upload (9–10) | ⬜ |
| F8 | Sheet page: tabs + AG Grid, edit cells | Sheet API (11) | ⬜ |
| F9 | Dashboard page: filter, KPIs, charts | Dashboard API (12) | ⬜ |
| F10 | Add tab / add column dialogs | (13) | ⬜ |
| F11 | Download Excel button | Export (14) | ⬜ |

### F1: Base UI
- Plain Tailwind. Small reusable components in `components/ui`.
- `(auth)/layout.tsx`: full-height page with a centered card.

### F2: Signup
- `SignupForm` (client): `name`, `email`, `password` with `useState`.
- Check in the browser too (password ≥ 12) for a better experience. The server still checks.
- `fetch('/api/auth/signup', { method: 'POST', ... })`.
- 201 → success message "Wait for admin approval". 400 → show the field errors. 409 → show the message.
- Disable the button while submitting, to avoid double signups.

### F3: Login + Pending
- `LoginForm`: 200 → `router.push('/dashboard')` (admins too). 403 pending → `router.push('/pending')`. 401 → "Invalid email or password".
- `router.refresh()` after login, so server components see the new cookie.

### F4: Protected area
- `(protected)/layout.tsx` (server): `const user = await getCurrentUser(); if (!user) redirect('/login')`.
- `proxy.ts`: if the path starts with `/dashboard`, `/sheet` or `/admin` and there's no `auth_token` cookie → redirect `/login`. It doesn't verify the JWT (the layout does).
- `LogoutButton`: POST `/api/auth/logout`, then `router.push('/login')`.
- Session is 15 min: when any API returns 401, send the user to `/login`.

### F5: Admin users
- `admin/layout.tsx` (server): `requireAdmin()` or redirect.
- `UsersTable`: tabs Pending / Approved / Rejected → SWR `GET /api/admin/users?status=`.
- Approve / Reject → PATCH, then `mutate()` to refresh the list.

### F7: Upload
- `<input type="file" accept=".xlsx">` → `FormData` → POST `/api/mis/upload`.
- Show the summary: tabs, rows and values imported, plus warnings.

### F8: Sheet
- AG Grid with column groups: each month is a group with 5 children (Actual LY, Actual CY, Budget, Var B, Var LY). Then Q1–Q4 and YTD.
- First column (line item) pinned left, header rows sticky, like Excel's freeze panes.
- Bold for total / margin rows, `%` format for percent rows, "–" for null.
- Only INPUT cells are editable (admin). On cell change → PATCH, then refetch so totals update.
- Negative variance in red, positive in green.

### F9: Dashboard
- `PeriodFilter` sets `?period=&month=`. SWR fetches `/api/mis/dashboard`.
- KPI cards on top, then 2×2 charts, then the variance table.
- Recharts components need `"use client"`.

### F10–F11
- Small dialogs posting to the add tab / column APIs.
- Download: `<a href="/api/mis/export?sheet=…">Download Excel</a>`. The cookie is sent automatically.

---

## 5. Packages to install (only when that step arrives)
```
F8: npm i ag-grid-community ag-grid-react
F9: npm i recharts
F5+: npm i swr
```

## 6. UX checklist
- Loading and error state on every form and page.
- Never show raw server errors. Show friendly messages.
- Mobile: the sidebar collapses. The grid scrolls horizontally.
