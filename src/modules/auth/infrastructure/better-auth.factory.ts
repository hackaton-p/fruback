import { Pool } from 'pg';
import { hash, compare } from 'bcryptjs';

export function trustedOrigins(): string[] {
  return [
    ...new Set(
      [
        process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
        ...(process.env.TRUSTED_ORIGINS ?? 'http://localhost:3001').split(','),
      ]
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}
export async function createBetterAuth() {
  const { betterAuth } = await import('better-auth');
  const { bearer } = await import('better-auth/plugins/bearer');
  const { openAPI } = await import('better-auth/plugins');
  const { createAuthMiddleware, APIError } = await import('better-auth/api');
  if (
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32
  )
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  if (!process.env.BETTER_AUTH_URL)
    throw new Error('BETTER_AUTH_URL is required');
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.BETTER_AUTH_URL.startsWith('https://')
  )
    throw new Error(
      'Production authentication requires an HTTPS BETTER_AUTH_URL',
    );
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    max: 5,
  });
  const auth = betterAuth({
    appName: 'Pura Fruit Packing',
    database: pool,
    trustedOrigins: trustedOrigins(),
    user: { modelName: 'auth_user' },
    session: {
      modelName: 'auth_session',
      expiresIn: 60 * 60 * 24,
      updateAge: 60 * 60,
      cookieCache: { enabled: false },
    },
    account: { modelName: 'auth_account', accountLinking: { enabled: false } },
    verification: { modelName: 'auth_verification' },
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 72,
      password: {
        hash: async (value) => {
          if (Buffer.byteLength(value, 'utf8') > 72)
            throw new APIError('BAD_REQUEST', {
              message: 'Password must not exceed 72 UTF-8 bytes',
            });
          return hash(value, 12);
        },
        verify: ({ password, hash: stored }) => compare(password, stored),
      },
    },
    hooks: {
      before: createAuthMiddleware((ctx) => {
        if (ctx.path === '/sign-up/email' && ctx.request)
          throw new APIError('FORBIDDEN', {
            message: 'Public registration is disabled',
          });
        return Promise.resolve();
      }),
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'auth_rate_limit',
      window: 60,
      max: 100,
      customRules: { '/sign-in/email': { window: 60, max: 10 } },
    },
    plugins: [bearer(), openAPI({ disableDefaultReference: true })],
  });
  return { auth, pool };
}
export type AuthRuntime = Awaited<ReturnType<typeof createBetterAuth>>;
export const AUTH_RUNTIME = Symbol('AUTH_RUNTIME');
export const AUTH_PATHS = [
  '/sign-in/email',
  '/sign-out',
  '/get-session',
  '/change-password',
  '/list-sessions',
  '/revoke-session',
  '/revoke-sessions',
  '/revoke-other-sessions',
  '/ok',
];
