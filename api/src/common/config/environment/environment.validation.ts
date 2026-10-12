import { z } from 'zod';

export const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

export function validateEnvironment(config: Record<string, unknown>) {
  return environmentSchema.parse(config);
}