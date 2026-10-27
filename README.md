# MealRelay — Surplus Food Recovery & Distribution Coordination Platform

> **Connecting surplus food with organizations that can distribute it.**  
> *MealRelay · Making surplus food count.*

---

## 1. Product Overview

Millions of portions of edible, freshly prepared food from cafeterias, restaurants, messes, and event caterers are discarded daily due to a lack of immediate coordination with community organizations that can redistribute it safely. 

**MealRelay** bridges this gap as a coordinated surplus-food recovery and distribution platform. Food donors publish time-limited, verifiable offers of surplus food with explicit preparation times, pickup deadlines, and consumption expiration limits. Verified NGOs, shelters, and food relief networks discover, reserve, and pick up donations before the food expires.

### Key Value Propositions
- **Real-Time Food Safety Schedules**: Every donation enforces strict timelines (`preparedAt`, `pickupDeadline`, and `consumeBy`). Overdue offers automatically expire to ensure food safety.
- **Race-Condition-Free Reservations**: Atomic PostgreSQL conditional updates prevent double-claims and reservation conflicts.
- **Secure Handover Verification**: A cryptographic 6-digit one-time code handshake ensures that surplus food is handed over only to authorized NGO representatives in person.
- **Trusted Organization Ecosystem**: Strict administrative review separates unverified applicants from approved donors and NGOs.
- **Tamper-Evident Audit Trail**: Every status transition, cancellation, claim, approval, and expiration is logged with actor metadata.

---

## 2. Target Roles & System Capabilities

### A. Food Donors (Restaurants, Hostel Messes, Cafeterias, Caterers)
- **Surplus Food Publishing**: Create detailed donation packages specifying quantity, unit, vegetarian / non-vegetarian / other classification, preparation timestamp, pickup deadline, and consume-by limit.
- **Posting Lifecycle Management**: Manage donations through standard statuses: `OPEN`, `CLAIMED`, `COMPLETED`, `EXPIRED`, `CANCELLED`.
- **In-Person Verification Handshake**: Once a donation is claimed, the owning donor securely retrieves a 6-digit pickup verification code to provide to the NGO driver upon physical collection.
- **Explicit Cancellation**: Cancel active donations with mandatory recorded reasons.
- **Donor Dashboard**: Monitor real-time operational metrics (open packages, claimed batches awaiting pickup, verified handoffs, and voided offers).

### B. Community Relief Organizations (NGOs, Food Banks, Shelters)
- **Discovery Feed**: Browse active surplus food offers in real-time, filtered by locality, food category, and urgent pickup deadlines.
- **Atomic Reservation**: Claim available batches with guaranteed single-winner concurrency control.
- **Collection Coordination**: View pickup locations, package descriptions, donor organization contact details, and remaining time to collection.
- **Handover Code Verification**: Submit the donor's 6-digit pickup verification code upon physical collection to finalize the transfer and update inventory records.
- **NGO Dashboard**: Track active reservations, completed collections, and reservation history.

### C. Platform Administrators
- **Organization Verification Console**: Review incoming registration requests from food donors and NGOs.
- **Verification Review**: Inspect organization name, entity type, physical address, locality, applicant contact details, and platform activity history.
- **Approve / Reject Workflow**: Enforce access permissions with mandatory rejection rationale logging.
- **Platform Integrity Monitoring**: Review audit timelines and system operational health.

---

## 3. System Architecture & Technical Stack

```mermaid
graph TD
    Client["React 18 + Vite Frontend\n(Tailwind CSS, Context API)"]
    API["Express 4 + Node.js REST API\n(Security Headers, Rate Limiting, Zod)"]
    Auth["JWT Authentication &\nRole-Based Authorization"]
    Engine["Transactional Recovery Engine\n(Atomic Claiming, Pickup Handshake)"]
    DB[("PostgreSQL 18 Database\n(Prisma ORM, Relational Models)")]
    Worker["Background Expiry Scheduler\n(node-cron, Idempotent Processing)"]

    Client -->|HTTPS / REST| API
    API --> Auth
    API --> Engine
    Engine --> DB
    Worker -->|Periodic Expiry Updates| DB
```

- **Frontend**: React 18, Vite 8, Tailwind CSS, Heroicons SVG system.
- **Backend**: Node.js (ES Modules), Express 4, express-rate-limit, CORS, custom security headers.
- **Database & ORM**: PostgreSQL 18, Prisma ORM 5 with connection pooling, declarative migrations, and relational integrity.
- **Authentication**: Stateless JSON Web Tokens (JWT) with bcrypt password hashing (cost factor 10).
- **Validation**: Schema-level request validation using Zod.
- **Background Worker**: `node-cron` worker processing overdue donation expirations idempotently.
- **Testing**: Vitest with Supertest integration testing against PostgreSQL.

---

## 4. Security Architecture & Hardening

1. **Authentication & Password Protection**:
   - Passwords hashed with `bcryptjs` (salt rounds: 10). Plaintext passwords are never logged or stored.
   - JWT tokens signed with SHA-256 HMAC secrets, verified by `requireAuth` middleware.
   - Public registration strictly restricts roles to `DONOR` or `NGO`; admin privileges cannot be acquired through API payloads or registration.

2. **Role & Organization Approval Enforcement**:
   - `requireRole('DONOR' | 'NGO' | 'ADMIN')` enforces functional separation on every protected route.
   - `requireApprovedOrganization` blocks pending or rejected donors from publishing surplus, and blocks pending or rejected NGOs from reserving food batches.

3. **Handshake Verification Cryptography**:
   - The 6-digit handover code is derived via HMAC-SHA256 (`crypto`) using a server-side secret and donation metadata.
   - Only its SHA-256 hash is persisted in the database; plaintext codes are never stored in the database.
   - Constant-time string comparison (`crypto.timingSafeEqual`) prevents timing-attack side channels.
   - Pickup verification is locked after 5 failed attempts to prevent brute-force attacks.
   - Verification codes are single-use; replayed verification requests are rejected with `409 Conflict`.
   - Codes are strictly accessible only by the owning donor organization via `GET /api/donations/:id/pickup-code`.

4. **Atomic Concurrency & Transaction Boundaries**:
   - Multi-step workflows (claiming, completing, cancelling) execute within atomic Prisma transactions (`prisma.$transaction`).
   - Claiming uses conditional atomic updates (`UPDATE "Donation" SET status = 'CLAIMED' WHERE id = $1 AND status = 'OPEN' AND pickupDeadline > NOW()`). If two NGOs claim simultaneously, exactly one succeeds; the second receives a clean `409 Conflict`.
   - Cancellation immediately invalidates outstanding pickup codes to prevent post-cancellation collection attempts.

5. **Rate Limiting & Security Headers**:
   - Strict rate limiting on authentication routes (30 requests / 15 minutes in production) prevents credential stuffing.
   - General API rate limiting (300 requests / 15 minutes) prevents service abuse.
   - Security headers set on all responses: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security` in production.
   - Request body size capped at 100kb to mitigate denial-of-service payloads.

---

## 5. Organization Approval & Trust Model

```mermaid
stateDiagram-v2
    [*] --> PENDING : Organization Registers
    PENDING --> APPROVED : Admin Approves (Audit Logged)
    PENDING --> REJECTED : Admin Rejects (Reason & Audit Logged)
    REJECTED --> APPROVED : Re-evaluated & Approved
    APPROVED --> REJECTED : Revoked by Admin (Reason Logged)
    
    state PENDING {
        [*] --> DiscoveryMode : Browse feed only
        DiscoveryMode --> PostingBlocked : Cannot post donations
        DiscoveryMode --> ClaimingBlocked : Cannot claim donations
    }
    
    state APPROVED {
        [*] --> FullAccess : Role-specific publishing / claiming enabled
    }
```

- Every newly registered organization enters `PENDING` status.
- While pending or rejected, organizations can view discovery feeds, but all mutation actions (`createDonation`, `claimDonation`) are blocked at both the middleware and service layers.
- Authorized platform administrators use the dedicated **Organization Verification Console** to inspect applicant information and decide whether to approve or reject the organization.
- Every approval decision records an immutable `AuditEvent` capturing actor ID, organization ID, previous status, new status, timestamp, and optional rejection reason.

---

## 6. Getting Started & Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **PostgreSQL**: v14 or later running locally or in Docker
- **npm**: v9 or later

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-org/MealRelay.git
cd MealRelay

# Install workspace root dependencies
npm install

# Install server and client dependencies
npm --prefix server install
npm --prefix client install
```

### 2. Configure Environment Variables

Create `.env` files from templates:

**Server Configuration (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/mealrelay?schema=public"
TEST_DATABASE_URL="postgresql://postgres:your_password@localhost:5432/mealrelay_test?schema=public"
JWT_SECRET="dev-mealrelay-jwt-secret-key-32chars-minimum-needed!"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
```

**Client Configuration (`client/.env`):**
```env
VITE_API_BASE_URL="http://localhost:5000/api"
```

### 3. Database Migration & Development Seed Data

```bash
# Apply Prisma schema migrations to local database
npm run migrate

# Seed development demo accounts and sample donations
npm run seed
```

#### Pre-configured Development Accounts
The seed script provisions pre-configured development accounts for quick testing:

| Role | Email | Password | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Approved Donor** | `donor@demo.org` | `DemoPass123!` | Approved | Green Bites Cafe (Can publish surplus) |
| **Approved NGO** | `ngo@demo.org` | `DemoPass123!` | Approved | Community Harvest (Can reserve surplus) |
| **Pending NGO** | `pending.ngo@demo.org` | `DemoPass123!` | Pending | Hope Shelter (Restricted onboarding view) |
| **Administrator** | `admin@demo.org` | `DemoPass123!` | Approved | Operational Hub (Admin console access) |

> *Note: Seed data is strictly restricted to development environments and is blocked when `NODE_ENV=production`.*

### 4. Running the Development Environment

Run both backend API and frontend client concurrently:

```bash
# Starts Express API (:5000) and Vite (:5173) concurrently
npm run dev
```

Alternatively, run services independently:
```bash
# Terminal 1: Backend API
npm run dev:server

# Terminal 2: Frontend Client
npm run dev:client
```

Open your browser to `http://localhost:5173`.

---

## 7. Production Deployment & Operations

### Production Architecture
MealRelay is architected for zero-overhead continuous deployment:
- **Frontend**: [Vercel](https://vercel.com) — React + Vite static bundle with automated Git deployments.
- **Backend**: [Render](https://render.com) — Node.js + Express web service with background expiry scheduling.
- **Database**: [Neon](https://neon.tech) — Serverless PostgreSQL with connection pooling.

### Production Environment Variables
In production environments (e.g. AWS ECS, Render, Railway, DigitalOcean, Heroku), provide the following environment variables:

| Variable | Description | Example / Requirement |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | Listening HTTP port | `5000` (or injected by platform) |
| `DATABASE_URL` | PostgreSQL connection pool URL | `postgresql://user:pass@db-host:5432/mealrelay?sslmode=require` |
| `JWT_SECRET` | Secure cryptographic secret | Minimum 32 characters, randomly generated |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `CLIENT_URL` | Deployed frontend domain for CORS | `https://mealrelay.example.com` |
| `ADMIN_EMAIL` | Primary administrator email for bootstrap | `admin@mealrelay.org` |
| `ADMIN_BOOTSTRAP_SECRET` | High-entropy secret for one-time admin setup | Random 32+ character secret |
| `VITE_API_BASE_URL` | Frontend API endpoint (Client only) | `https://api.mealrelay.example.com/api` |

The backend validates required production settings at startup and safely aborts if `DATABASE_URL` or a secure `JWT_SECRET` is missing.

### Production Startup Procedure

1. **Deploy Database Migrations**:
   ```bash
   npm --prefix server run prisma:migrate:deploy
   ```
2. **Build Frontend Bundle**:
   ```bash
   npm run build
   ```
   *Static assets are generated into `client/dist` and can be served via Nginx, AWS S3 / CloudFront, or Cloudflare Pages.*
3. **Start Production Backend API**:
   ```bash
   npm --prefix server run start
   ```

### Health Monitoring & Expiry Worker Architecture
- **Health Check**: `GET /api/health` returns `200 OK` with database connectivity status and uptime metrics without exposing credentials.
- **Background Expiry Scheduler**:
  - In a standard single-instance deployment, `node-cron` automatically runs every 2 minutes.
  - In multi-instance or horizontal auto-scaling clusters, `processExpiredDonations()` uses atomic conditional updates (`UPDATE "Donation" SET status = 'EXPIRED' WHERE id = $1 AND status = 'OPEN' AND pickupDeadline <= NOW()`). Even if multiple instances execute simultaneously, exactly one instance transitions each record and records the audit event. For dedicated worker topologies, disable cron on web nodes and run a dedicated worker process.

---

## 8. API Reference Summary

### Interactive OpenAPI Documentation (`/api/docs`)
- `GET /api/docs` — Interactive Swagger UI explorer for executing and inspecting all endpoints with JWT bearer authentication.
- `GET /api/docs/openapi.json` — OpenAPI 3.0.3 specification in machine-readable JSON format.

### Platform Administration (`/api/admin`)
- `POST /api/admin/bootstrap` — One-time provisioning endpoint for the initial platform administrator. Secured by timing-safe secret matching against `ADMIN_BOOTSTRAP_SECRET` and `ADMIN_EMAIL`. Rate-limited and permanently sealed in database audit history.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new donor or NGO account (starts in `PENDING` status).
- `POST /api/auth/login` — Authenticate with email/password; returns JWT and organization metadata.
- `GET /api/auth/me` — Retrieve active session and organization approval state.

### Donations (`/api/donations`)
- `GET /api/donations` — Browse active food offers (supports pagination, locality, foodType, status, and organization filters).
- `GET /api/donations/:id` — Retrieve full donation details and current status.
- `POST /api/donations` — Publish a new surplus food batch (Requires approved DONOR).
- `PATCH /api/donations/:id` — Update editable fields of an OPEN donation (Requires owning DONOR).
- `POST /api/donations/:id/claim` — Atomically reserve a donation (Requires approved NGO).
- `POST /api/donations/:id/verify-pickup` — Submit 6-digit pickup code upon collection (Requires claiming NGO).
- `POST /api/donations/:id/cancel` — Cancel an eligible donation with reason (Requires owning DONOR or claiming NGO).
- `GET /api/donations/:id/pickup-code` — Securely retrieve 6-digit pickup code (Requires owning DONOR of CLAIMED offer).
- `GET /api/donations/:id/history` — Retrieve chronological audit trail for a donation.

### Organization Management (`/api/organizations`)
- `GET /api/organizations` — List and filter organizations (Requires ADMIN; supports `approvalStatus`, `type`, `search`, `page`, `limit`).
- `GET /api/organizations/:id` — Inspect organization profile and location.
- `PATCH /api/organizations/:id/approval` — Approve or reject an organization with audit-logged reason (Requires ADMIN).

### Dashboard & Analytics (`/api/dashboard`)
- `GET /api/dashboard/summary` — Database-derived operational metrics scoped to the authenticated organization's role.

### Health Check (`/api/health`)
- `GET /api/health` — Verifies service status, database connectivity, and uptime.

---

## 9. Automated Testing & Verification Suite

MealRelay includes a comprehensive Vitest integration suite that validates end-to-end API workflows, concurrency control, security restrictions, and administrative decisions against a real PostgreSQL test database.

```bash
# Run integration test suite
npm run test
```

### Verified Test Suites (57 Passing Tests)

```
 RUN  v2.1.9 C:/Users/Darshan Patil H J/Desktop/MealRelay/server

 ✓ tests/phase2.test.js (31 tests)
    ✓ 1. NGO can successfully claim an OPEN donation
    ✓ 2. Claimed donation transitions to CLAIMED with claimedByOrganizationId set
    ✓ 3. Donor cannot claim its own donation (403 Forbidden)
    ✓ 4. Unauthenticated claim request is rejected with 401
    ✓ 5. Already-claimed donation returns a 409 Conflict
    ✓ 6. Expired donation cannot be claimed (409 Conflict)
    ✓ 7. Two simultaneous claims from different NGOs result in exactly one winner
    ✓ 8. Failed claim transactions leave no orphaned verification record or audit event
    ✓ 9. Claim creates a valid pickup-verification record in DB
    ✓ 10. Only the authorized donor can access the pickup code
    ✓ 11. Only the NGO holding the claim can verify the code
    ✓ 12. Invalid code is rejected with 400 Bad Request
    ✓ 13. Expired code is rejected with 409 Conflict
    ✓ 14. Successful verification transitions CLAIMED to COMPLETED
    ✓ 15. Replayed verification is rejected with 409 Conflict
    ✓ 16. Concurrent verification attempts cannot complete the donation twice
    ✓ 17. Code hashes and codes never appear in unauthorized responses or audit metadata
    ✓ 18. Expiry job transitions overdue OPEN donations to EXPIRED
    ✓ 19. Expiry job does not expire CLAIMED or COMPLETED donations
    ✓ 20. Running expiry twice does not duplicate events (idempotent)
    ✓ 21. Donor can cancel its eligible OPEN donation
    ✓ 22. Unauthorized cancellation is rejected (403 Forbidden)
    ✓ 23. Cancellation invalidates any outstanding pickup code
    ✓ 24. Completed donations cannot be cancelled (409 Conflict)
    ✓ 25. Invalid status transitions (e.g. editing CLAIMED) are rejected
    ✓ 26. Claim creates exactly one corresponding audit event
    ✓ 27. Completion creates the expected audit event
    ✓ 28. Cancellation and expiration create audit events
    ✓ 29. Unauthorized users cannot access another organization's private history
    ✓ 30. Dashboard counts reflect real persisted records
    ✓ 31. Pagination and organization scoping work correctly for claims and donations

 ✓ tests/api.test.js (15 tests)
    ✓ 1. Health endpoint succeeds and verifies database connectivity
    ✓ 2. Registration creates a user with a password hash, not a plaintext password
    ✓ 3. Duplicate email registration is rejected with conflict error (409)
    ✓ 4. Public registration cannot create an ADMIN even if requested
    ✓ 5. Login succeeds with valid credentials and returns safe fields
    ✓ 6. Login fails with invalid credentials (401)
    ✓ 7. Unauthenticated donation creation is rejected with 401
    ✓ 8. A non-donor (NGO) cannot publish a donation (403)
    ✓ 9. Invalid quantity (<= 0) and invalid timestamps are rejected with 400
    ✓ 10. An approved donor can create a donation with status OPEN and audit log
    ✓ 11. A user cannot modify another organization's donation (403)
    ✓ 12. An unauthorized user cannot view private non-open donation details (403)
    ✓ 13. Pagination and filters behave correctly
    ✓ 14. Invalid JSON produces a controlled error response with code INVALID_JSON (400)
    ✓ 15. Owning donor can update OPEN donation, but cannot edit non-OPEN donation

 ✓ tests/admin.test.js (11 tests)
    ✓ 1. GET /api/organizations is rejected with 401 for unauthenticated requests
    ✓ 2. GET /api/organizations is rejected with 403 Forbidden for non-admin roles (DONOR)
    ✓ 3. GET /api/organizations is rejected with 403 Forbidden for non-admin roles (NGO)
    ✓ 4. Admin can list organizations with pagination and member contact details
    ✓ 5. Admin can filter organizations by approvalStatus (PENDING)
    ✓ 6. Admin can search organizations by name query
    ✓ 7. Non-admin users cannot approve their own or another organization
    ✓ 8. Invalid approval status values are rejected with 400 Bad Request
    ✓ 9. Admin can reject an organization with a recorded reason and audit event
    ✓ 10. Rejected NGO cannot claim donations (403 Forbidden)
    ✓ 11. Admin can approve a pending/rejected organization with audit event

 Test Files: 3 passed (3)
 Tests:      57 passed (57)
```

---

## 10. Deferred Roadmap & Scope Discipline

In keeping with disciplined software product engineering, the following advanced capabilities are deliberately deferred for subsequent feature milestones:
- **Direct SMS / Push Notifications**: Outbound webhook or push service integrations.
- **Geospatial Distance Search**: PostGIS-based GPS radius calculation and routing.
- **Document Vault Storage**: Encrypted cloud storage for legal organization registration documents (e.g. 501(c)(3) / 80G certificates).
- **Public Ratings & Reliability Scoring**: Community feedback and partner reliability metrics.

---

## 11. License & Operational Governance

MealRelay is open-source software built for surplus food recovery and coordination.  
*MealRelay · Making surplus food count.*
