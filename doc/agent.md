# Agent Guidelines & Engineering Standards: Secure Auth App

> **Project**: Secure JWT Authentication and Admin Approval System  
> **Approach**: Standard Next.js Full-Stack Architecture (Clean, beginner-friendly structure using `lib/`)  
> **Framework**: Next.js 16 (App Router) with TypeScript  
> **Database / ORM**: PostgreSQL with Prisma 7 (`@prisma/adapter-pg`)  
> **Target Audience**: AI Agents and Engineers contributing to this repository

---

## 1. Learning Project Constraints & Guidelines

This repository is an **educational, learning-oriented project**. All agents interacting with the user must strictly obey the following rules:

1. **Standard & Clean Structure**: All core server logic, database client, auth utilities, and schemas live directly under the main `lib/` directory (`@/lib/*`). Extra wrapper folders like `backend/` or `frontend/` have been removed to keep the architecture standard and intuitive.
2. **Never Dump Code Without Explanation**: Do not generate large chunks of unexplained code. Teach and explain concepts step by step.
3. **No Repetitive / Automated Test Loops**: Do not run repetitive test suites or test loops in the background unless explicitly requested by the user.
4. **Zero Secrets in Git**: `JWT_SECRET`, database passwords, and connection strings must remain exclusively in `.env`.
5. **Zero Trust Security**: Never trust client inputs for `is_admin`, roles, or approval status. All security logic and authorization checks must be enforced strictly on the server.

---

## 2. Standardized Project Structure

```
secure-auth-app/
├── app/                                # Next.js Routing
│   └── api/                            # REST API Route Handlers
│       ├── auth/                       # /api/auth/signup, /api/auth/login, /api/auth/logout, /api/auth/me
│       └── admin/                      # /api/admin/users, /api/admin/users/[id]/approve, etc.
├── lib/                                # Core Business Logic & Shared Utilities
│   ├── auth/                           # JWT generation/verification, password hashing, cookies
│   ├── authorization/                  # Server-side RBAC helpers (requireAuth, requireAdmin)
│   ├── db/                             # Prisma database client singleton (lib/db/prisma.ts)
│   └── validation/                     # Zod input validation schemas
├── prisma/                             # Database Layer
│   ├── schema.prisma                   # PostgreSQL database models (User, AccountStatus enum)
│   └── seed.ts                         # One-time bootstrap script for initial admin
├── types/                              # Shared TypeScript types & API response shapes
├── doc/                                # Architectural & Planning Documentation
│   ├── agent.md                        # This instruction file
│   └── plan.md                         # Phased implementation roadmap
├── .env                                # Local environment secrets (ignored)
├── .env.example                        # Sanitized environment template
├── prisma7.config.ts                   # Prisma 7 configuration file
└── README.md                           # Main project overview & developer guide
```

---

## 3. Core Security Specifications

### 3.1 Password Security
- Passwords must be hashed using Argon2id or bcrypt (salt rounds >= 12).
- Plaintext passwords must never be stored, logged, or returned in API responses.

### 3.2 JWT Architecture
- **Algorithm**: Explicitly sign and verify using `HS256`.
- **Secret Key**: `JWT_SECRET` loaded from server environment variables (minimum 32 bytes).
- **Payload**: Minimal claims only (`sub: user.id`, `email: user.email`, `role: user.is_admin ? "ADMIN" : "USER"`).
- **Expiration**: 10–15 minute access tokens.
- **Session Transport**: HTTP-only, `Secure` (production), `SameSite=Lax` cookies.

### 3.3 Account Status Lifecycle (RBAC)
- `PENDING`: User registered; cannot log in, cannot access protected APIs.
- `APPROVED`: Admin approved; allowed to log in and receive JWT session.
- `REJECTED`: Admin rejected; access denied.
- `DISABLED`: Admin suspended account; access denied.

---

## 4. Teaching & Delivery Protocol

When instructed to implement any step:
1. Explain **what** the concept does and **why** it is needed in beginner-friendly terms.
2. Outline the specific file being created or modified.
3. Provide clean, well-commented code.
4. Explain how to test and verify the feature manually.
