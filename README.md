# Secure JWT Authentication and Admin Approval System

A production-ready authentication and authorization system built with **Next.js 16 Route Handlers**, **TypeScript**, and **PostgreSQL with Prisma 7**.

The system enforces administrative approval gating: users can register, but cannot authenticate until an administrator reviews and approves their account.

---

## 📁 Project Structure

The project uses the standard, intuitive Next.js architecture with `lib/` for server logic and `app/api/` for endpoints:

```
secure-auth-app/
├── app/                                # Next.js Routing
│   └── api/                            # Backend REST Route Handlers
│       ├── auth/                       # /api/auth/{signup, login, logout, me}
│       └── admin/                      # /api/admin/users/{approve, reject, status}
├── lib/                                # Core Business Logic & Shared Utilities
│   ├── auth/                           # JWT creation/verification, password hashing, cookies
│   ├── authorization/                  # RBAC guards (requireAuth, requireAdmin)
│   ├── db/                             # Prisma database client (lib/db/prisma.ts)
│   └── validation/                     # Zod input validation schemas
├── prisma/                             # Database Layer
│   ├── schema.prisma                   # PostgreSQL models (User, AccountStatus enum)
│   └── seed.ts                         # Initial admin bootstrap script
├── types/                              # Shared TypeScript types & API envelopes
├── doc/                                # Architectural & Learning Documentation
│   ├── agent.md                        # Learning guidelines & security rules
│   └── plan.md                         # Step-by-step phased roadmap
├── .env                                # Local secrets (PostgreSQL connection, JWT Secret)
├── .env.example                        # Template environment variables
├── prisma7.config.ts                   # Prisma 7 configuration file
└── README.md                           # Project guide
```

---

## ⚙️ Environment Configuration

Ensure your `.env` contains:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/secure_auth_db?schema=public"
JWT_SECRET="<generated_32_byte_secret>"
```

Generate a random secret anytime using:
```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register new user with `PENDING` status |
| `POST` | `/api/auth/login` | Public | Validate credentials, check status, issue JWT cookie |
| `POST` | `/api/auth/logout` | Authenticated | Clear HTTP-only session cookie |
| `GET` | `/api/auth/me` | Authenticated | Fetch current user safe profile |
| `GET` | `/api/admin/users` | Admin Only | List users with optional `?status=` filter |
| `PATCH` | `/api/admin/users/:id/approve` | Admin Only | Approve user and record approval timestamp |
| `PATCH` | `/api/admin/users/:id/reject` | Admin Only | Reject user registration request |
| `PATCH` | `/api/admin/users/:id/status` | Admin Only | Update account status (e.g. `DISABLED`) |

---

## 📚 Documentation & Roadmap

- [doc/agent.md](file:///c:/Users/Priyanka/Projects/interra/secure-auth-app/doc/agent.md) — Learning guidelines & agent instructions.
- [doc/plan.md](file:///c:/Users/Priyanka/Projects/interra/secure-auth-app/doc/plan.md) — Step-by-step backend roadmap.
