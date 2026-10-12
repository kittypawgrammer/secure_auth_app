# Master Implementation Plan: Secure JWT Authentication

> **Document**: `doc/plan.md`  
> **Status**: Ready for Learning & Step-by-Step Execution  
> **Structure**: Standard Next.js Full-Stack Architecture using `lib/`  
> **Stack**: Next.js 16 (Route Handlers), TypeScript, PostgreSQL, Prisma 7, Jose (JWT), Bcrypt / Argon2, Zod

---

## 1. Project Philosophy & Learning Objective

To keep things straightforward and intuitive, the project uses the **standard Next.js structure**:
- All server-side business logic, database models, auth helpers, and schemas live directly under `lib/`.
- All HTTP endpoints live under `app/api/`.
- No extraneous wrapper folders (`backend/` or `frontend/`). Everything is clean and standard.

---

## 2. Project Directory Structure

```
secure-auth-app/
├── app/                                # Next.js Routing
│   └── api/                            # Backend REST Route Handlers
│       ├── auth/
│       │   ├── signup/route.ts         # POST: Register user with PENDING status
│       │   ├── login/route.ts          # POST: Validate credentials, check status, set JWT cookie
│       │   ├── logout/route.ts         # POST: Clear session cookie
│       │   └── me/route.ts             # GET: Fetch authenticated user profile
│       └── admin/
│           └── users/
│               ├── route.ts            # GET: List users (filtered by ?status=)
│               ├── [id]/approve/route.ts # PATCH: Approve user registration
│               ├── [id]/reject/route.ts  # PATCH: Reject user registration
│               └── [id]/status/route.ts  # PATCH: Change status (e.g. DISABLE)
├── lib/                                # Core Business Logic & Shared Utilities
│   ├── auth/
│   │   ├── password.ts                 # Password hashing & verification
│   │   ├── jwt.ts                      # JWT HS256 signing, verification & validation
│   │   └── cookies.ts                  # Secure HTTP-only cookie handlers
│   ├── authorization/
│   │   └── rbac.ts                     # getCurrentUser, requireAuth, requireAdmin, requireApprovedUser
│   ├── db/
│   │   └── prisma.ts                   # Prisma client singleton with PostgreSQL adapter
│   └── validation/
│       ├── auth.schema.ts              # Zod schemas for signup & login payloads
│       └── admin.schema.ts             # Zod schemas for admin operations
├── prisma/                             # Database Layer
│   ├── schema.prisma                   # PostgreSQL models (User, AccountStatus enum)
│   └── seed.ts                         # One-time bootstrap script for initial admin
├── types/                              # Shared TypeScript Types
│   ├── auth.ts                         # JWT claims, UserSafe, Session definitions
│   └── api.ts                          # Standardized JSON response envelope
├── doc/                                # Documentation & Guides
│   ├── agent.md                        # Learning guidelines & engineering rules
│   └── plan.md                         # This phased roadmap
├── .env.example                        # Template environment variables
├── .env                                # Local secrets (PostgreSQL connection & JWT Secret)
└── README.md                           # Project guide
```

---

## 3. Step-by-Step Implementation Roadmap

### Step 1: PostgreSQL & Prisma 7 Database Modeling
- **Concept**: Define the `User` table and `AccountStatus` enum (`PENDING`, `APPROVED`, `REJECTED`, `DISABLED`).
- **File**: `prisma/schema.prisma`
- **Output**: Synchronize PostgreSQL database schema.

### Step 2: Initial Admin Account Seeding Script
- **Concept**: Public signup must never allow admin creation. Create a one-time script that securely generates the root admin account with `is_admin = true` and `status = "APPROVED"`.
- **File**: `prisma/seed.ts`
- **Output**: Verify admin creation in PostgreSQL.

### Step 3: Cryptography & Security Utilities
- **Concept**:
  - Hashing passwords with Argon2id or bcrypt (salt rounds >= 12).
  - Signing and verifying JWTs using `jose` with `HS256` and a 15-minute expiration.
  - Setting and clearing HTTP-only, SameSite cookies.
- **Files**:
  - `lib/auth/password.ts`
  - `lib/auth/jwt.ts`
  - `lib/auth/cookies.ts`
  - `types/auth.ts`

### Step 4: Request Validation with Zod
- **Concept**: Validate all incoming API request bodies on the server before database interaction.
- **Files**:
  - `lib/validation/auth.schema.ts` (Signup, Login schemas)
  - `lib/validation/admin.schema.ts` (User status update schemas)

### Step 5: Server-Side RBAC & Authorization Layer
- **Concept**: Reusable server-side functions that inspect the incoming request, verify the JWT, check current PostgreSQL user status, and enforce access rules:
  - `getCurrentUser()`
  - `requireAuth()`
  - `requireApprovedUser()`
  - `requireAdmin()`
- **File**: `lib/authorization/rbac.ts`

### Step 6: Public Authentication Route Handlers
- **Concept**: Implement the core authentication endpoints:
  - `POST /api/auth/signup`: Validates input, hashes password, saves user as `PENDING` (no JWT returned).
  - `POST /api/auth/login`: Checks password, verifies status (`PENDING` / `REJECTED` / `DISABLED` blocked; `APPROVED` gets an HTTP-only JWT cookie).
  - `POST /api/auth/logout`: Clears session cookie.
  - `GET /api/auth/me`: Returns sanitized user details.
- **Files**: `app/api/auth/*/route.ts`

### Step 7: Admin User Management Route Handlers
- **Concept**: Implement endpoints restricted strictly to administrators:
  - `GET /api/admin/users`: Lists users, optionally filtered by status (e.g. `?status=PENDING`).
  - `PATCH /api/admin/users/[id]/approve`: Approves a pending user.
  - `PATCH /api/admin/users/[id]/reject`: Rejects a registration request.
  - `PATCH /api/admin/users/[id]/status`: Disables or reactivates accounts.
- **Files**: `app/api/admin/users/*/route.ts`

---

## 4. UI Layer (When Ready)
Whenever you decide to add the visual pages, we can easily add components into `components/` and routes into `app/` (`/login`, `/signup`, `/pending-approval`, `/dashboard`, `/admin/dashboard`).
