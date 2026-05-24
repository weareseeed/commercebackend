import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from the monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
});

export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;
