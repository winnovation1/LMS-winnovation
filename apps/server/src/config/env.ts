import { config } from 'dotenv';
import path from 'node:path';

const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : process.env.NODE_ENV === 'test'
      ? '.env.test'
      : '.env.local';

// Load from cwd, apps/server, or the monorepo root. npm workspace scripts run
// with cwd = apps/server, so the repo-root env files must be checked via
// '../..'. dotenv never overrides, so earlier entries win.
for (const p of [
  path.resolve(process.cwd(), envFile),
  path.resolve(process.cwd(), 'apps/server', envFile),
  path.resolve(process.cwd(), '../..', envFile),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/server', '.env'),
  path.resolve(process.cwd(), '../..', '.env'),
]) {
  config({ path: p });
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
    refreshSecret: required('JWT_REFRESH_SECRET'),
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '30d',
  },
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  razorpay: {
    keyId: required('RAZORPAY_KEY_ID'),
    keySecret: required('RAZORPAY_KEY_SECRET'),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    contactEmail: process.env.CONTACT_EMAIL ?? 'forge@winnovation.org',
  },
  // Certificate verification links point here — the client origin, not the
  // API's own origin, since /verify/:token is meant to be a public page a
  // recruiter opens in a browser, not a raw API JSON response.
  publicAppUrl: process.env.PUBLIC_APP_URL ?? process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
};
