# MealRelay — Surplus Food Recovery & Distribution Platform

> **Connecting surplus food with organizations that can distribute it.**

## 📹 Demo Video

[![MealRelay Demo](https://img.youtube.com/vi/WRoiqd7R-Bc/maxresdefault.jpg)](https://youtu.be/WRoiqd7R-Bc)

▶️ **[Watch the full demo on YouTube](https://youtu.be/WRoiqd7R-Bc)**

---

## Overview

**MealRelay** is a full-stack surplus food recovery platform that coordinates time-sensitive food donations between verified donors (restaurants, messes, caterers) and approved community NGOs (shelters, food banks). Every donation enforces strict pickup deadlines, and a cryptographic 6-digit handover code ensures safe in-person collection.

## Key Features

- **Real-Time Discovery Feed** — Browse surplus food filtered by locality, food type, and urgency countdowns.
- **Atomic Reservations** — Race-condition-free claiming via PostgreSQL conditional updates; no double-claims possible.
- **6-Digit Pickup Verification** — HMAC-SHA256 derived one-time codes with constant-time comparison and brute-force lockout.
- **Organization Trust Model** — Admin-verified approval workflow for all donors and NGOs before they can post or claim.
- **Automated Expiry** — Background scheduler (`node-cron`) expires overdue donations idempotently.
- **Tamper-Evident Audit Trail** — Every status transition is logged with actor, timestamp, and metadata.
- **Glassmorphism UI** — Modern frosted-glass interface with ambient gradient canvas and elevated card interactions.

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Frontend | React 18, Vite 8, Tailwind CSS 4, Lucide Icons |
| Backend | Node.js, Express 4, Zod validation, JWT auth, bcrypt |
| Database | PostgreSQL (Neon Serverless), Prisma ORM 5 |
| Testing | Vitest + Supertest (57 integration tests) |
| Deployment | Vercel (frontend), Render (backend), Neon (database) |

## Quick Start

```bash
git clone https://github.com/kunaljaiswal2461-lab/end_term_MealRelay.git
cd end_term_MealRelay
npm install && npm --prefix server install && npm --prefix client install
npm run migrate
npm run seed
npm run dev
```

Open `http://localhost:5173` in your browser.

### Demo Accounts (password: `DemoPass123!`)

| Role | Email | Access |
|:-----|:------|:-------|
| Food Donor | `donor@demo.org` | Post surplus, view pickup codes |
| Approved NGO | `ngo@demo.org` | Browse, claim, verify pickup |
| Administrator | `admin@demo.org` | Approve orgs, audit logs |

## API Endpoints

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/api/auth/register` | Register donor or NGO |
| `POST` | `/api/auth/login` | Authenticate and get JWT |
| `GET` | `/api/donations` | Browse available donations |
| `POST` | `/api/donations` | Post surplus food (donor) |
| `POST` | `/api/donations/:id/claim` | Reserve a donation (NGO) |
| `POST` | `/api/donations/:id/verify-pickup` | Submit 6-digit code |
| `GET` | `/api/donations/:id/pickup-code` | Get pickup code (donor) |
| `PATCH` | `/api/organizations/:id/approval` | Approve/reject org (admin) |
| `GET` | `/api/dashboard/summary` | Role-based analytics |
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/docs` | Interactive Swagger UI |

## Security

- Passwords hashed with bcrypt (cost 10); plaintext never stored or logged
- JWT tokens with HMAC-SHA256; role-based middleware on every protected route
- Pickup codes: HMAC-derived, hash-only storage, constant-time comparison, 5-attempt lockout
- Rate limiting: 30 req/15min on auth, 300 req/15min globally
- Security headers: `nosniff`, `DENY`, `XSS-Protection`, `HSTS`
- All mutations wrapped in Prisma `$transaction` for atomicity
- No API keys, credentials, or secrets exposed in repository

## Repository

- **Source Code**: [github.com/kunaljaiswal2461-lab/end_term_MealRelay](https://github.com/kunaljaiswal2461-lab/end_term_MealRelay)
- **Demo Video**: [youtu.be/WRoiqd7R-Bc](https://youtu.be/WRoiqd7R-Bc)

---

*MealRelay · Making surplus food count.*
