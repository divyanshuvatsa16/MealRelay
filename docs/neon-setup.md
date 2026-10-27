# MealRelay on Neon

The workspace is linked to project `winter-hill-98530835`, branch `production`,
in organization `org-damp-river-62901692`. `.neon` and all real environment files
are gitignored. Run `neon login` on another machine, then:

```powershell
neon init -y --org-id org-damp-river-62901692 --project-id winter-hill-98530835 --branch production --services postgres --no-agent-setup
neon deploy
npm run migrate:deploy
npm run build
npm run dev
```

On Windows with restricted PowerShell scripts, use `neon.cmd` and `npm.cmd`.
Agent setup is skipped above because the Neon plugin is already installed.

`neon deploy` provisions the services in `neon.ts` and pulls their environment
variables; it does not host the Express server or Vite frontend. The only
requested service is Postgres. MealRelay keeps its existing JWT authentication.

## Connections and environment files

The existing Prisma 5 client uses a standard PostgreSQL connection from the
long-running Node/Express process. No additional serverless driver is needed.
`DATABASE_URL` is pooled for application traffic. Prisma's `directUrl` uses
`DATABASE_URL_UNPOOLED` for migrations. Never expose either URL through `VITE_`.

The API, seed script, and Prisma npm scripts share the same environment loader.
Existing process variables win, followed by `server/.env.test` in test mode,
`server/.env.local`, root `.env.local`, `server/.env`, and root `.env`.
For local PostgreSQL, the direct URL defaults to `DATABASE_URL` if omitted.

Keep a persistent, randomly generated `JWT_SECRET` in a private server or root
environment file. Frontend configuration stays in `client/.env`, with
`VITE_API_BASE_URL=http://localhost:5000/api` for local use.

Open http://localhost:5173. The API health check at
http://localhost:5000/api/health must report `database: connected`.

On this workstation those ports were already occupied. The private root
`.env.local` sets `PORT=5001` and `CLIENT_URL=http://localhost:5174`, and
`client/.env` points to `http://localhost:5001/api`. The verified built frontend
is running at http://localhost:5174. For subsequent development, run the API
with `npm run dev:server` and Vite with
`npm --prefix client run dev -- --port 5174 --strictPort`.

With the API running, `npm run smoke:neon` verifies HTTP health, registration,
database persistence, hashed passwords, login, and authenticated reads. It
removes only its uniquely named temporary account and related records. Override
the API location with `SMOKE_API_URL` if needed.

Do not run the integration suite against production. For tests, use an isolated
Neon branch and supply its URL as `DATABASE_URL` (and its direct URL as
`DATABASE_URL_UNPOOLED`) in `server/.env.test` or the test process environment.
`TEST_DATABASE_URL` alone does not switch the current test runner's database.

Verify schema migrations on a disposable branch before applying them to
production. Only use the development demo seed on an isolated database.
