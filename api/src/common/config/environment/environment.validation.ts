import { z } from 'zod';

export const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().max(65535).default(3000),

  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  DB_HOST: z.string().min(1),

  DB_PORT: z.coerce.number().int().positive().max(65535).default(5432),

  DB_USER: z.string().min(1),

  DB_PASSWORD: z.string().min(1),

  DB_NAME: z.string().min(1),
});

export function validateEnvironment(config: Record<string, unknown>) {
  return environmentSchema.parse(config);
}
