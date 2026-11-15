import { jest } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { Server } from 'node:http';
import { DataSourceOptions } from 'typeorm';
import { generateKeyPairSync, randomBytes } from 'node:crypto';

import { AppModule } from '../src/root/app.module.js';
import { configureApplication } from '../src/root/bootstrap/application-bootstrap.js';
import { AccountEntity } from '../src/core/account/data/entity/account.entity.js';
import { AuthIdentifierEntity } from '../src/core/auth/data/entity/auth-identifier.entity.js';
import { PasswordCredentialEntity } from '../src/core/auth/data/entity/password-credential.entity.js';

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

const testKeyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const testPrivateKey = testKeyPair.privateKey
  .export({ type: 'pkcs8', format: 'pem' })
  .toString();
const testPublicKey = testKeyPair.publicKey
  .export({ type: 'spki', format: 'pem' })
  .toString();

const baseEnvironment: Record<string, string> = {
  NODE_ENV: 'TEST',
  APP_NAME: 'api',
  APP_PORT: '3000',
  APP_BASE_URL: 'api',
  APP_CORS_ORIGIN: 'http://localhost:4200',
  APP_TRUST_PROXY: 'false',
  APP_HTTP_PAYLOAD_ERROR_CODE: '422',
  LOG_LEVEL: 'silent',
  SWAGGER_ENABLED: 'true',
  SWAGGER_TITLE: 'API',
  SWAGGER_DESCRIPTION: 'HTTP API',
  SWAGGER_VERSION: '0.1.0',
  SWAGGER_PATH: 'docs',
  DB_TYPE: 'postgres',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_DATABASE: 'api',
  DB_SYNC: 'false',
  DB_MIGRATION: 'false',
  DB_LOG: 'false',
  DB_SCHEMA: 'public',
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
  AUTH_JWT_ACTIVE_KID: 'test-active',
  AUTH_JWT_PRIVATE_KEY_BASE64: Buffer.from(testPrivateKey).toString('base64'),
  AUTH_JWT_PUBLIC_KEYS_JSON: JSON.stringify({
    'test-active': Buffer.from(testPublicKey).toString('base64'),
  }),
  AUTH_TEST_REFRESH_FAILURE_POINT: '',
};

type App = Server;

type TestNestApplication = INestApplication<App>;

type FakeDataSource = {
  options: DataSourceOptions;
  entityMetadatas: Array<{ target: unknown }>;
  getRepository: jest.Mock;
  query: jest.Mock<(sql: string) => Promise<unknown[]>>;
};

type TestApp = {
  app: TestNestApplication;
  dataSource: FakeDataSource;
};

type ApiEnvelopeBody<TData = unknown> = {
  code: string;
  result: boolean;
  data: TData;
  validationErrors: Array<{
    property: string;
    messages: string[];
  }>;
};

type HealthBody = {
  status: string;
  info: Record<string, { status: string }>;
};

type SwaggerResponseObject = {
  content?: Record<
    string,
    {
      schema?: {
        example?: unknown;
      };
    }
  >;
};

type SwaggerOperationObject = {
  responses: Record<string, SwaggerResponseObject>;
  parameters?: Array<{ in?: string; name?: string; required?: boolean }>;
  security?: Array<Record<string, unknown>>;
};

type SwaggerPathItemObject = {
  get?: SwaggerOperationObject;
  post?: SwaggerOperationObject;
};

type SwaggerBody = {
  info: {
    title: string;
  };
  paths: Record<string, SwaggerPathItemObject>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<
      string,
      { type?: string; in?: string; name?: string }
    >;
  };
};

type HealthExample = {
  status: string;
  info: Record<string, { status: string }>;
  error: Record<string, { status: string }>;
  details: Record<string, { status: string }>;
};

const applyEnvironment = (overrides: Record<string, string> = {}): void => {
  Object.assign(process.env, baseEnvironment, overrides);
};

const createFakeDataSource = (): FakeDataSource => {
  const query = jest.fn<(sql: string) => Promise<unknown[]>>();
  query.mockResolvedValue([{ result: 1 }]);

  return {
    options: { type: 'postgres' },
    entityMetadatas: [
      { target: AccountEntity },
      { target: AuthIdentifierEntity },
      { target: PasswordCredentialEntity },
    ],
    getRepository: jest.fn(),
    query,
  };
};

const responseBody = <TBody>(body: unknown): TBody => body as TBody;

const httpServer = (app: TestNestApplication): App => app.getHttpServer();

const swaggerGetOperation = (
  swagger: SwaggerBody,
  path: string,
): SwaggerOperationObject => {
  const operation = swagger.paths[path]?.get;

  if (!operation) {
    throw new Error(`Swagger GET operation was not found for ${path}`);
  }
  return operation;
};

const swaggerJsonExample = (response: SwaggerResponseObject): HealthExample => {
  const example = response.content?.['application/json']?.schema?.example;

  if (!example) {
    throw new Error('Swagger JSON response example was not found');
  }

  return example as HealthExample;
};

const expectTestApp = (testApp: TestApp | undefined): TestApp => {
  if (!testApp) {
    throw new Error('Test application was not initialized');
  }

  return testApp;
};

const createApp = async (
  overrides: Record<string, string> = {},
): Promise<TestApp> => {
  applyEnvironment(overrides);

  const dataSource = createFakeDataSource();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule.register()],
  })
    .overrideProvider(getDataSourceToken())
    .useValue(dataSource)
    .compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureApplication(app);
  await app.init();

  return { app: app, dataSource };
};

describe('API technical foundation (e2e)', () => {
  let testApp: TestApp | undefined;

  beforeEach(async () => {
    testApp = await createApp();
  });

  afterEach(async () => {
    await testApp?.app.close();
    testApp = undefined;
  });

  it('boots the application and exposes liveness', async () => {
    const app = expectTestApp(testApp).app;
    const response = await request(httpServer(app))
      .get('/health/live')
      .expect(200);
    const body = responseBody<HealthBody>(response.body);

    expect(body.status).toBe('ok');
    expect(body.info.application.status).toBe('up');
  });

  it('rejects unknown authentication DTO properties', async () => {
    const app = expectTestApp(testApp).app;
    const response = await request(httpServer(app))
      .post('/api/auth/register')
      .send({
        email: 'ada@example.com',
        password: 'a sufficiently long password',
        role: 'admin',
      })
      .expect(422);
    const body = responseBody<ApiEnvelopeBody<null>>(response.body);

    expect(body).toMatchObject({
      code: 'api.common.validation-error',
      result: false,
      data: null,
    });
    const roleError = body.validationErrors.find(
      (validationError) => validationError.property === 'role',
    );
    expect(roleError?.messages).toContain(
      'api.common.validation.error.whitelist-validation',
    );
  });

  it('returns a structured password validation error when the password is too short', async () => {
    const app = expectTestApp(testApp).app;
    const submittedPassword = 'short-pass';
    const response = await request(httpServer(app))
      .post('/api/auth/register')
      .send({ email: 'short@example.com', password: submittedPassword })
      .expect(422);
    const body = responseBody<ApiEnvelopeBody<null>>(response.body);

    expect(body.code).toBe('api.auth.password-policy-invalid');
    expect(body.validationErrors).toEqual([
      {
        property: 'password',
        messages: ['api.auth.register.error.password.too-short'],
      },
    ]);
    expect(JSON.stringify(body)).not.toContain(submittedPassword);
  });

  it('returns a structured password validation error when the password is too long', async () => {
    const app = expectTestApp(testApp).app;
    const submittedPassword = 'x'.repeat(129);
    const response = await request(httpServer(app))
      .post('/api/auth/register')
      .send({ email: 'long@example.com', password: submittedPassword })
      .expect(422);
    const body = responseBody<ApiEnvelopeBody<null>>(response.body);

    expect(body.code).toBe('api.auth.password-policy-invalid');
    expect(body.validationErrors).toEqual([
      {
        property: 'password',
        messages: ['api.auth.register.error.password.too-long'],
      },
    ]);
    expect(JSON.stringify(body)).not.toContain(submittedPassword);
  });

  it('returns an action-specific validation key for an invalid registration email', async () => {
    const app = expectTestApp(testApp).app;
    const response = await request(httpServer(app))
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: 'a sufficiently long password',
      })
      .expect(422);
    const body = responseBody<ApiEnvelopeBody<null>>(response.body);

    expect(body.code).toBe('api.common.validation-error');
    expect(body.validationErrors).toEqual(
      expect.arrayContaining([
        {
          property: 'email',
          messages: ['api.auth.register.error.email.invalid'],
        },
      ]),
    );
  });

  it('returns a server-generated ULID X-Request-Id header on every response', async () => {
    const app = expectTestApp(testApp).app;
    const response = await request(httpServer(app))
      .get('/health/live')
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(ULID_REGEX);
  });

  it('accepts a well-formed incoming X-Request-Id', async () => {
    const app = expectTestApp(testApp).app;
    const incomingRequestId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';

    const response = await request(httpServer(app))
      .get('/health/live')
      .set('X-Request-Id', incomingRequestId)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(incomingRequestId);
  });

  it('ignores a malformed incoming X-Request-Id and generates a new one', async () => {
    const app = expectTestApp(testApp).app;
    const response = await request(httpServer(app))
      .get('/health/live')
      .set('X-Request-Id', 'not-a-ulid')
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(ULID_REGEX);
    expect(response.headers['x-request-id']).not.toBe('not-a-ulid');
  });

  it('checks database readiness', async () => {
    const app = expectTestApp(testApp).app;
    const response = await request(httpServer(app))
      .get('/health/ready')
      .expect(200);
    const body = responseBody<HealthBody>(response.body);

    expect(body.status).toBe('ok');
    expect(body.info.database.status).toBe('up');
    expect(expectTestApp(testApp).dataSource.query).toHaveBeenCalledWith(
      'SELECT 1',
    );
  });

  it('serves Swagger authentication and health contracts', async () => {
    await expectTestApp(testApp).app.close();
    testApp = await createApp({
      NODE_ENV: 'DEV',
    });

    const app = expectTestApp(testApp).app;
    const response = await request(httpServer(app))
      .get('/docs/openapi.json')
      .expect(200);
    const body = responseBody<SwaggerBody>(response.body);

    expect(body.info.title).toBe('API');
    expect(
      body.paths['/api/auth/register']?.post?.responses['422'],
    ).toBeDefined();
    expect(body.components.securitySchemes['access-cookie']).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'hoos-access',
    });
    expect(body.components.securitySchemes['refresh-cookie']).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'hoos-refresh',
    });
    const refreshOperation = body.paths['/api/auth/refresh']?.post;
    const logoutOperation = body.paths['/api/auth/logout']?.post;
    const accountMeOperation = body.paths['/api/account/me']?.get;
    expect(refreshOperation?.security).toContainEqual({
      'refresh-cookie': [],
    });
    expect(logoutOperation?.security).toContainEqual({
      'access-cookie': [],
    });
    expect(accountMeOperation?.security).toContainEqual({
      'access-cookie': [],
    });
    expect(accountMeOperation?.responses['200']).toBeDefined();
    expect(accountMeOperation?.responses['401']).toBeDefined();
    expect(refreshOperation?.parameters).toContainEqual(
      expect.objectContaining({
        in: 'header',
        name: 'X-CSRF-Token',
        required: true,
      }),
    );
    const livenessOperation = swaggerGetOperation(body, '/health/live');
    const readinessOperation = swaggerGetOperation(body, '/health/ready');
    const livenessDocumentation = JSON.stringify(livenessOperation);
    const readinessDocumentation = JSON.stringify(readinessOperation);

    expect(livenessOperation.responses['200']).toBeDefined();
    expect(livenessOperation.responses['503']).toBeUndefined();
    expect(livenessDocumentation).not.toContain('database');

    expect(readinessOperation.responses['200']).toBeDefined();
    expect(readinessOperation.responses['503']).toBeDefined();

    const readinessOkExample = swaggerJsonExample(
      readinessOperation.responses['200'],
    );
    const readinessUnavailableExample = swaggerJsonExample(
      readinessOperation.responses['503'],
    );

    expect(readinessOkExample.info.database.status).toBe('up');
    expect(readinessOkExample.details.database.status).toBe('up');
    expect(readinessUnavailableExample.error.database.status).toBe('down');
    expect(readinessUnavailableExample.details.database.status).toBe('down');

    expect(readinessDocumentation).toContain('PostgreSQL');
    expect(readinessDocumentation).toContain('TypeORM');
    expect(`${livenessDocumentation} ${readinessDocumentation}`).not.toMatch(
      /redis|cache|mail/i,
    );
  });
});
