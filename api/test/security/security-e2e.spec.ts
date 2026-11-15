import { generateKeyPairSync, randomBytes } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { Pool } from 'pg';
import request from 'supertest';
import type { Server } from 'node:http';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../../src/root/app.module.js';
import { configureApplication } from '../../src/root/bootstrap/application-bootstrap.js';
import { TokenCryptoService } from '../../src/core/auth/service/token-crypto.service.js';

const ORIGIN = 'http://localhost:4200';
const TEST_DATABASE =
  process.env.SECURITY_TEST_DATABASE ?? process.env.DB_DATABASE ?? 'hoos';
const TEST_SCHEMA = `security_test_${process.pid}`;

const keyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const privateKey = keyPair.privateKey
  .export({ type: 'pkcs8', format: 'pem' })
  .toString();
const publicKey = keyPair.publicKey
  .export({ type: 'spki', format: 'pem' })
  .toString();

type App = Server;

let app: INestApplication<App> | undefined;
let dataSource: DataSource | undefined;

const httpServer = (): App => {
  if (!app) {
    throw new Error('Security app is not initialized');
  }
  return app.getHttpServer();
};

const setSecurityEnvironment = (failurePoint = ''): void => {
  const base = {
    NODE_ENV: 'DEV',
    APP_NAME: 'security-test',
    APP_PORT: '3001',
    APP_BASE_URL: 'api',
    APP_CORS_ORIGIN: `${ORIGIN},https://trusted.example.test`,
    APP_TRUST_PROXY: 'false',
    APP_HTTP_PAYLOAD_ERROR_CODE: '422',
    LOG_LEVEL: 'silent',
    SWAGGER_ENABLED: 'true',
    SWAGGER_TITLE: 'Security Test API',
    SWAGGER_DESCRIPTION: 'Security test API',
    SWAGGER_VERSION: 'test',
    SWAGGER_PATH: 'docs',
    DB_TYPE: 'postgres',
    DB_HOST: process.env.DB_HOST ?? 'localhost',
    DB_PORT: process.env.DB_PORT ?? '5432',
    DB_USER: process.env.DB_USER ?? 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD ?? 'postgres',
    DB_DATABASE: TEST_DATABASE,
    DB_SCHEMA: TEST_SCHEMA,
    DB_SYNC: 'false',
    DB_MIGRATION: 'true',
    DB_LOG: 'false',
    AUTH_PASSWORD_MIN_LENGTH: '15',
    AUTH_PASSWORD_MAX_LENGTH: '128',
    AUTH_PASSWORD_ARGON2_MEMORY_COST: '19456',
    AUTH_PASSWORD_ARGON2_TIME_COST: '2',
    AUTH_PASSWORD_ARGON2_PARALLELISM: '1',
    AUTH_PASSWORD_MAX_ATTEMPTS: '5',
    AUTH_PASSWORD_LOCKOUT_SECONDS: '900',
    AUTH_ACCESS_TOKEN_TTL_SECONDS: '600',
    AUTH_REFRESH_TOKEN_TTL_SECONDS: '604800',
    AUTH_SESSION_ABSOLUTE_TTL_SECONDS: '2592000',
    AUTH_REFRESH_TOKEN_PEPPER: randomBytes(32).toString('base64'),
    AUTH_JWT_ACTIVE_KID: 'security-test',
    AUTH_JWT_PRIVATE_KEY_BASE64: Buffer.from(privateKey).toString('base64'),
    AUTH_JWT_PUBLIC_KEYS_JSON: JSON.stringify({
      'security-test': Buffer.from(publicKey).toString('base64'),
    }),
    AUTH_TEST_REFRESH_FAILURE_POINT: failurePoint,
  };
  Object.assign(process.env, base);
};

const quoteIdentifier = (value: string): string => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(
      'SECURITY_TEST_DATABASE must be a safe PostgreSQL identifier',
    );
  }
  return `"${value}"`;
};

const createSecuritySchema = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Security tests cannot run with NODE_ENV=production');
  }
  const admin = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: TEST_DATABASE,
  });
  try {
    await admin.query(
      `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(TEST_SCHEMA)}`,
    );
  } finally {
    await admin.end();
  }
};

const createSecurityApp = async (failurePoint = ''): Promise<void> => {
  if (app) {
    await app.close();
  }
  app = undefined;
  dataSource = undefined;
  setSecurityEnvironment(failurePoint);
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule.register()],
  }).compile();
  app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureApplication(app);
  await app.init();
  dataSource = app.get(DataSource);
};

const closeSecurityApp = async (): Promise<void> => {
  if (app) {
    await app.close();
  }
  app = undefined;
  dataSource = undefined;
};

const resetDatabase = async (): Promise<void> => {
  if (!dataSource) {
    throw new Error('Security DataSource is not initialized');
  }
  await dataSource.query(
    'TRUNCATE TABLE "auth_refresh_token", "auth_session", "password_credential", "auth_identifier", "account" RESTART IDENTITY CASCADE',
  );
};

const query = async <T = Record<string, unknown>>(
  sql: string,
  parameters: unknown[] = [],
): Promise<T[]> => {
  if (!dataSource) {
    throw new Error('Security DataSource is not initialized');
  }
  return dataSource.query(sql, parameters);
};

type CookieSet = {
  access: string;
  refresh: string;
  csrf: string;
};

type Credentials = {
  email: string;
  password: string;
};

type AccountMeBody = {
  code: string;
  result: boolean;
  data: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
};

const cookieValue = (cookies: string[], name: string): string => {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) {
    throw new Error(`Cookie ${name} was not returned`);
  }
  return cookie.split(';', 1)[0].slice(name.length + 1);
};

const cookiesFromLogin = (setCookie: string[] | undefined): CookieSet => {
  if (!setCookie) {
    throw new Error('Login did not return cookies');
  }
  return {
    access: cookieValue(setCookie, 'hoos-access'),
    refresh: cookieValue(setCookie, 'hoos-refresh'),
    csrf: cookieValue(setCookie, 'hoos-csrf'),
  };
};

const cookieHeader = (cookies: CookieSet): string =>
  `hoos-access=${cookies.access}; hoos-refresh=${cookies.refresh}; hoos-csrf=${cookies.csrf}`;

const registerAccount = async (): Promise<Credentials> => {
  const credentials = {
    email: `security-${Date.now()}-${Math.random()}@example.com`,
    password: 'a sufficiently long secure passphrase',
  };
  await request(httpServer())
    .post('/api/auth/register')
    .set('Origin', ORIGIN)
    .send(credentials)
    .expect(201);
  return credentials;
};

const loginWith = async (credentials: Credentials): Promise<request.Response> =>
  request(httpServer())
    .post('/api/auth/login')
    .set('Origin', ORIGIN)
    .send(credentials)
    .expect(200);

const registerAndLogin = async (): Promise<CookieSet> => {
  const credentials = await registerAccount();
  const response = await loginWith(credentials);
  return cookiesFromLogin(response.headers['set-cookie'] as unknown as string[]);
};

const refreshWith = async (
  cookies: CookieSet,
  origin = ORIGIN,
): Promise<request.Response> =>
  request(httpServer())
    .post('/api/auth/refresh')
    .set('Origin', origin)
    .set('X-CSRF-Token', cookies.csrf)
    .set('Cookie', cookieHeader(cookies));

beforeAll(async () => {
  await createSecuritySchema();
  await createSecurityApp();
});

afterAll(async () => {
  await closeSecurityApp();
  const admin = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: TEST_DATABASE,
  });
  await admin.query(
    `DROP SCHEMA IF EXISTS ${quoteIdentifier(TEST_SCHEMA)} CASCADE`,
  );
  await admin.end();
});

beforeEach(async () => {
  await resetDatabase();
});

describe('real PostgreSQL refresh races', () => {
  it.each([2, 5, 10, 25])(
    'REFRESH-CONCURRENT-%i consumes one token at most once',
    async (count) => {
      await closeSecurityApp();
      await createSecurityApp();
      const cookies = await registerAndLogin();
      const requests = Array.from({ length: count }, () =>
        refreshWith(cookies),
      );
      const responses = await Promise.all(requests);
      const successful = responses.filter(
        (response) => response.status === 200,
      );
      expect(successful).toHaveLength(1);
      expect(
        responses.filter((response) => response.status === 401),
      ).toHaveLength(count - 1);

      const fingerprint = app
        ?.get(TokenCryptoService)
        .fingerprint(cookies.refresh);
      const oldToken = await query<{ id: string; consumed_at: Date | null }>(
        'SELECT id, consumed_at FROM "auth_refresh_token" WHERE token_hash = $1',
        [fingerprint],
      );
      expect(oldToken).toHaveLength(1);
      expect(oldToken?.[0].consumed_at).not.toBeNull();
      const descendants = await query<{ id: string }>(
        'SELECT id FROM "auth_refresh_token" WHERE parent_id = $1',
        [oldToken?.[0].id],
      );
      expect(descendants).toHaveLength(1);
      const session = await query<{ revoked_at: Date | null }>(
        'SELECT revoked_at FROM "auth_session" LIMIT 1',
      );
      expect(session[0].revoked_at).not.toBeNull();
    },
    30_000,
  );
});

describe('refresh family replay and rollback', () => {
  it('REFRESH-REPLAY-01 revokes the family when R1 is reused after R1 -> R2 -> R3', async () => {
    const r1 = await registerAndLogin();
    const r2Response = await refreshWith(r1);
    expect(r2Response.status).toBe(200);
    const r2 = {
      access: cookieValue(r2Response.headers['set-cookie'] as unknown as string[], 'hoos-access'),
      refresh: cookieValue(r2Response.headers['set-cookie'] as unknown as string[], 'hoos-refresh'),
      csrf: r1.csrf,
    };
    const r3Response = await refreshWith(r2);
    expect(r3Response.status).toBe(200);
    const r3 = {
      access: cookieValue(r3Response.headers['set-cookie'] as unknown as string[], 'hoos-access'),
      refresh: cookieValue(r3Response.headers['set-cookie'] as unknown as string[], 'hoos-refresh'),
      csrf: r1.csrf,
    };

    expect((await refreshWith(r1)).status).toBe(401);
    expect((await refreshWith(r2)).status).toBe(401);
    const latestAccess = await request(httpServer())
      .post('/api/auth/logout')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', r3.csrf)
      .set('Cookie', cookieHeader(r3));
    expect(latestAccess.status).toBe(401);
    const session = await query<{ revoked_at: Date | null }>(
      'SELECT revoked_at FROM "auth_session" LIMIT 1',
    );
    expect(session?.[0].revoked_at).not.toBeNull();
  });

  it.each(['after-consumed', 'after-successor-persistence'])(
    'ROLLBACK-%s leaves the original refresh state atomic',
    async (failurePoint) => {
      await closeSecurityApp();
      await createSecurityApp(failurePoint);
      const cookies = await registerAndLogin();
      const result = await refreshWith(cookies);
      expect(result.status).toBe(500);
      const fingerprint = app
        ?.get(TokenCryptoService)
        .fingerprint(cookies.refresh);
      const rows = await query<{ id: string; consumed_at: Date | null }>(
        'SELECT id, consumed_at FROM "auth_refresh_token" WHERE token_hash = $1',
        [fingerprint],
      );
      expect(rows?.[0].consumed_at).toBeNull();
      const tokens = await query<{ count: number }>(
        'SELECT count(*)::int AS count FROM "auth_refresh_token"',
      );
      expect(tokens?.[0].count).toBe(1);
      await closeSecurityApp();
      await createSecurityApp();
    },
    30_000,
  );

  it.each(['during-session-revocation', 'during-family-revocation'])(
    'ROLLBACK-%s restores revocation state after injected failure',
    async (failurePoint) => {
      await closeSecurityApp();
      await createSecurityApp(failurePoint);
      const cookies = await registerAndLogin();
      const response = await request(httpServer())
        .post('/api/auth/logout')
        .set('Origin', ORIGIN)
        .set('X-CSRF-Token', cookies.csrf)
        .set('Cookie', cookieHeader(cookies));
      expect(response.status).toBe(500);
      const sessions = await query<{ revoked_at: Date | null }>(
        'SELECT revoked_at FROM "auth_session" LIMIT 1',
      );
      expect(sessions[0].revoked_at).toBeNull();
      await closeSecurityApp();
      await createSecurityApp();
    },
    30_000,
  );
});

describe('cookie transport, CSRF and session revocation', () => {
  it('COOKIE-E2E-01 returns tokens only in hardened cookies', async () => {
    const credentials = await registerAccount();
    const response = await loginWith(credentials);
    const serializedBody = JSON.stringify(response.body);
    expect(serializedBody).not.toMatch(
      /accessToken|refreshToken|csrfToken|hoos-access|hoos-refresh/i,
    );

    const setCookies = response.headers['set-cookie'] as unknown as string[];
    const access = setCookies.find((value) => value.startsWith('hoos-access='));
    const refresh = setCookies.find((value) =>
      value.startsWith('hoos-refresh='),
    );
    const csrf = setCookies.find((value) => value.startsWith('hoos-csrf='));
    expect(access).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/HttpOnly/i);
    expect(csrf).not.toMatch(/HttpOnly/i);
    for (const cookie of [access, refresh, csrf]) {
      expect(cookie).toMatch(/Path=\//i);
      expect(cookie).toMatch(/SameSite=Strict/i);
    }
  });

  it.each([
    ['missing', undefined],
    ['incorrect', 'attacker-csrf-token'],
  ])('CSRF-E2E-%s rejects refresh without rotation', async (_, csrfToken) => {
    const cookies = await registerAndLogin();
    let pending = request(httpServer())
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', cookieHeader(cookies));
    if (csrfToken) {
      pending = pending.set('X-CSRF-Token', csrfToken);
    }
    const response = await pending;
    expect(response.status).toBe(403);

    const fingerprint = app
      ?.get(TokenCryptoService)
      .fingerprint(cookies.refresh);
    const token = await query<{ consumed_at: Date | null }>(
      'SELECT consumed_at FROM "auth_refresh_token" WHERE token_hash = $1',
      [fingerprint],
    );
    expect(token[0].consumed_at).toBeNull();
  });

  it('SESSION-REVOKE-01 invalidates current access and refresh tokens on logout', async () => {
    const cookies = await registerAndLogin();
    await request(httpServer())
      .post('/api/auth/logout')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', cookies.csrf)
      .set('Cookie', cookieHeader(cookies))
      .expect(200);

    await request(httpServer())
      .post('/api/auth/logout')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', cookies.csrf)
      .set('Cookie', cookieHeader(cookies))
      .expect(401);
    expect((await refreshWith(cookies)).status).toBe(401);
    const state = await query<{
      revoked_at: Date | null;
      active_tokens: number;
    }>(
      `SELECT s.revoked_at,
        count(t.id) FILTER (WHERE t.revoked_at IS NULL)::int AS active_tokens
       FROM "auth_session" s
       LEFT JOIN "auth_refresh_token" t ON t.session_id = s.id
       GROUP BY s.id`,
    );
    expect(state[0].revoked_at).not.toBeNull();
    expect(state[0].active_tokens).toBe(0);
  });

  it('SESSION-REVOKE-ALL-01 invalidates every existing account session', async () => {
    const credentials = await registerAccount();
    const first = cookiesFromLogin(
      (await loginWith(credentials)).headers['set-cookie'] as unknown as string[],
    );
    const second = cookiesFromLogin(
      (await loginWith(credentials)).headers['set-cookie'] as unknown as string[],
    );

    await request(httpServer())
      .post('/api/auth/logout-all')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', first.csrf)
      .set('Cookie', cookieHeader(first))
      .expect(200);

    expect((await refreshWith(second)).status).toBe(401);
    const sessions = await query<{ revoked_at: Date | null }>(
      'SELECT revoked_at FROM "auth_session"',
    );
    expect(sessions).toHaveLength(2);
    expect(sessions.every((session) => session.revoked_at !== null)).toBe(true);
  });
});

describe('current account authentication boundary', () => {
  beforeEach(async () => {
    await closeSecurityApp();
    await createSecurityApp();
  });

  it('ACCOUNT-ME-01 rejects unauthenticated requests', async () => {
    const response = await request(httpServer()).get('/api/account/me');
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: 'api.auth.unauthorized',
      result: false,
      data: null,
    });
  });

  it('ACCOUNT-ME-02 returns only the authenticated account public fields', async () => {
    const cookies = await registerAndLogin();
    const accounts = await query<{ id: string }>(
      'SELECT id FROM "account" LIMIT 1',
    );
    const response = await request(httpServer())
      .get('/api/account/me')
      .set('Cookie', cookieHeader(cookies));
    const body = response.body as AccountMeBody;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      code: 'api.account.me.success',
      result: true,
      data: {
        id: accounts[0].id,
        status: 'ACTIVE',
      },
    });
    expect(body.data).toMatchObject({
      id: accounts[0].id,
      status: 'ACTIVE',
    });
    expect(Object.keys(body.data).sort()).toEqual([
      'createdAt',
      'id',
      'status',
      'updatedAt',
    ]);
    expect(Number.isNaN(Date.parse(body.data.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(body.data.updatedAt))).toBe(false);
  });
});

describe('account/session/token mismatch matrix', () => {
  it('MISMATCH-01 rejects an account A JWT carrying session B', async () => {
    const accountA = await registerAndLogin();
    const accountB = await registerAndLogin();
    const tokenCrypto = app?.get(TokenCryptoService);
    const sessions = await query<{ id: string; account_id: string }>(
      'SELECT id, account_id FROM "auth_session" ORDER BY created_at ASC',
    );
    const forged = tokenCrypto?.signAccessToken(
      sessions?.[0].account_id,
      sessions?.[1].id,
      1,
    );
    const response = await request(httpServer())
      .post('/api/auth/logout')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', accountB.csrf)
      .set('Cookie', `hoos-access=${forged}; hoos-csrf=${accountB.csrf}`);
    expect(response.status).toBe(401);
    expect(accountA.access).not.toBe(accountB.access);
  });

  it('MISMATCH-02 rejects a valid token after the Account is disabled', async () => {
    const cookies = await registerAndLogin();
    await query(`UPDATE "account" SET status = 'DISABLED'`);
    const response = await request(httpServer())
      .post('/api/auth/logout')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', cookies.csrf)
      .set('Cookie', cookieHeader(cookies));
    expect(response.status).toBe(401);
  });

  it('MISMATCH-03 rejects refresh for an expired session and bearer-only access', async () => {
    const cookies = await registerAndLogin();
    await query(
      `UPDATE "auth_session" SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second'`,
    );
    expect((await refreshWith(cookies)).status).toBe(401);
    const bearer = await request(httpServer())
      .post('/api/auth/logout')
      .set('Origin', ORIGIN)
      .set('Authorization', `Bearer ${cookies.access}`)
      .set('X-CSRF-Token', cookies.csrf);
    expect(bearer.status).toBe(401);
  });
});

describe('CORS, CSRF and refresh origin attacks', () => {
  beforeEach(async () => {
    await closeSecurityApp();
    await createSecurityApp();
  });

  it('CORS-01 allows the configured origin and rejects lookalike origins', async () => {
    const allowed = await request(httpServer())
      .options('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Access-Control-Request-Method', 'POST');
    expect(allowed.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const attacker = await request(httpServer())
      .options('/api/auth/refresh')
      .set('Origin', 'https://localhost:4200.attacker.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(attacker.headers['access-control-allow-origin']).toBeUndefined();
  });

  it.each([
    'https://localhost:4200.attacker.example',
    'https://attacker-localhost:4200',
    'https://localhost:4200',
    'http://localhost:4200:443',
    'null',
  ])('CORS-ATTACK-%s rejects refresh without rotating', async (origin) => {
    const cookies = await registerAndLogin();
    const response = await refreshWith(cookies, origin);
    expect(response.status).not.toBe(200);
    const fingerprint = app
      ?.get(TokenCryptoService)
      .fingerprint(cookies.refresh);
    const token = await query<{ consumed_at: Date | null }>(
      'SELECT consumed_at FROM "auth_refresh_token" WHERE token_hash = $1',
      [fingerprint],
    );
    expect(token?.[0].consumed_at).toBeNull();
  });
});

describe('password login rate limiting and proxy spoofing', () => {
  it('RATE-LOGIN-01 throttles repeated password attempts despite forwarded-IP spoofing', async () => {
    await closeSecurityApp();
    await createSecurityApp();
    const email = 'rate-limit@example.com';
    const password = 'a sufficiently long secure passphrase';
    await request(httpServer())
      .post('/api/auth/register')
      .set('Origin', ORIGIN)
      .send({ email, password });
    const responses = [];
    for (let index = 0; index < 12; index += 1) {
      responses.push(
        await request(httpServer())
          .post('/api/auth/login')
          .set('Origin', ORIGIN)
          .set('X-Forwarded-For', `203.0.113.${index + 1}`)
          .send({ email: 'not-an-email', password: 'x' }),
      );
    }
    expect(responses.some((response) => response.status === 429)).toBe(true);
  });
});
