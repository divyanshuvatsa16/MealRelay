import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = fileURLToPath(new URL('../../', import.meta.url));
const workspaceRoot = path.resolve(serverRoot, '..');

// Existing process variables always win. Neon writes its credentials at the
// workspace root; .env.local takes precedence over template-derived .env files.
const files = [
  ...(process.env.NODE_ENV === 'test' ? [path.join(serverRoot, '.env.test')] : []),
  path.join(serverRoot, '.env.local'),
  path.join(workspaceRoot, '.env.local'),
  path.join(serverRoot, '.env'),
  path.join(workspaceRoot, '.env')
];

for (const file of files) dotenv.config({ path: file });

// Local PostgreSQL users can use one direct URL. Neon supplies both URLs.
if (process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
}
