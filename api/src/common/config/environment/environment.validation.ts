import { z } from 'zod';

export const environmentSchema = z
  .object({
    PORT: z.coerce.number().int().positive().max(65535).default(3000),

    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    DB_HOST: z.string().min(1),

    DB_PORT: z.coerce.number().int().positive().max(65535).default(5432),

    DB_USER: z.string().min(1),

    DB_PASSWORD: z.string().min(1),

    DB_NAME: z.string().min(1),
    AUTH_PASSWORD_MIN_LENGTH: z.coerce.number().int().min(1).default(15),
    AUTH_PASSWORD_MAX_LENGTH: z.coerce
      .number()
      .int()
      .min(64)
      .max(1024)
      .default(128),
    AUTH_PASSWORD_ARGON2_MEMORY_COST: z.coerce
      .number()
      .int()
      .min(19456)
      .default(19456),
    AUTH_PASSWORD_ARGON2_TIME_COST: z.coerce.number().int().min(2).default(2),
    AUTH_PASSWORD_ARGON2_PARALLELISM: z.coerce.number().int().min(1).default(1),
    AUTH_PASSWORD_MAX_ATTEMPTS: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(5),
    AUTH_PASSWORD_LOCKOUT_SECONDS: z.coerce.number().int().min(1).default(900),
    AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(1)
      .max(600)
      .default(600),
    AUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(1)
      .default(604800),
    AUTH_SESSION_ABSOLUTE_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(1)
      .default(2592000),
    AUTH_REFRESH_TOKEN_PEPPER: z.string().default(''),
    AUTH_JWT_ACTIVE_KID: z.string().default('dev-active'),
    AUTH_JWT_PRIVATE_KEY_BASE64: z.string().default(''),
    AUTH_JWT_PUBLIC_KEYS_JSON: z.string().default('{}'),
    AUTH_TEST_REFRESH_FAILURE_POINT: z
      .enum([
        '',
        'after-successor-persistence',
        'after-consumed',
        'during-session-revocation',
        'during-family-revocation',
      ])
      .default(''),
  })
  .superRefine((environment, context) => {
    if (
      environment.AUTH_PASSWORD_MIN_LENGTH >
      environment.AUTH_PASSWORD_MAX_LENGTH
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AUTH_PASSWORD_MIN_LENGTH'],
        message:
          'AUTH_PASSWORD_MIN_LENGTH cannot exceed AUTH_PASSWORD_MAX_LENGTH',
      });
    }
    if (
      environment.AUTH_REFRESH_TOKEN_TTL_SECONDS >
      environment.AUTH_SESSION_ABSOLUTE_TTL_SECONDS
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AUTH_REFRESH_TOKEN_TTL_SECONDS'],
        message: 'Refresh token TTL cannot exceed absolute session TTL',
      });
    }
    if (environment.NODE_ENV === 'production') {
      if (environment.AUTH_TEST_REFRESH_FAILURE_POINT) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AUTH_TEST_REFRESH_FAILURE_POINT'],
          message: 'Test failure injection is forbidden in production',
        });
      }
      if (!environment.AUTH_REFRESH_TOKEN_PEPPER) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AUTH_REFRESH_TOKEN_PEPPER'],
          message: 'Production refresh token pepper is required',
        });
      }
      if (
        !environment.AUTH_JWT_PRIVATE_KEY_BASE64 ||
        environment.AUTH_JWT_PUBLIC_KEYS_JSON === '{}'
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AUTH_JWT_PRIVATE_KEY_BASE64'],
          message: 'Production JWT key material is required',
        });
      }
    }
  });

export function validateEnvironment(config: Record<string, unknown>) {
  return environmentSchema.parse(config);
}
