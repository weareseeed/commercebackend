import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from the monorepo root or current directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const isTest = process.env.NODE_ENV === 'test';

const EnvSchema = z.object({
  DATABASE_URL: isTest ? z.string().default('postgresql://mock') : z.string(),
  STRIPE_SECRET_KEY: isTest ? z.string().default('sk_test_mock') : z.string(),
  STRIPE_WEBHOOK_SECRET: isTest ? z.string().default('whsec_mock') : z.string(),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  BYPASS_STRIPE_SIGNATURE: z.string().optional(),
  OPERATOR_API_KEY: isTest ? z.string().default('operator_test_key') : z.string().optional(),
});

// Run raw parse first
const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:', parsed.error.format());
  process.exit(1);
}

const isPlaceholder = (val: string) => {
  const v = val.toLowerCase();
  return (
    v.includes('placeholder') ||
    v.includes('mock') ||
    v.includes('your_') ||
    v.includes('sk_test_xxx') ||
    v.includes('whsec_xxx') ||
    v === 'sk_test_' ||
    v === 'whsec_'
  );
};

const validatedEnv = parsed.data;

if (validatedEnv.NODE_ENV === 'production') {
  const errors: string[] = [];
  if (isPlaceholder(validatedEnv.STRIPE_SECRET_KEY)) {
    errors.push('STRIPE_SECRET_KEY is a placeholder or mock value');
  }
  if (isPlaceholder(validatedEnv.STRIPE_WEBHOOK_SECRET)) {
    errors.push('STRIPE_WEBHOOK_SECRET is a placeholder or mock value');
  }
  if (validatedEnv.BYPASS_STRIPE_SIGNATURE === 'true') {
    errors.push('BYPASS_STRIPE_SIGNATURE cannot be true in production');
  }
  if (!validatedEnv.OPERATOR_API_KEY || isPlaceholder(validatedEnv.OPERATOR_API_KEY)) {
    errors.push('OPERATOR_API_KEY is required in production and cannot be a placeholder');
  }
  if (errors.length > 0) {
    console.error('❌ Production startup failed due to invalid Stripe configuration:');
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
} else if (validatedEnv.NODE_ENV === 'development') {
  if (isPlaceholder(validatedEnv.STRIPE_SECRET_KEY)) {
    console.warn('⚠️ WARNING: STRIPE_SECRET_KEY contains a placeholder or mock value.');
  }
  if (isPlaceholder(validatedEnv.STRIPE_WEBHOOK_SECRET)) {
    console.warn('⚠️ WARNING: STRIPE_WEBHOOK_SECRET contains a placeholder or mock value.');
  }
}

export const env = validatedEnv;
export type Env = z.infer<typeof EnvSchema>;
