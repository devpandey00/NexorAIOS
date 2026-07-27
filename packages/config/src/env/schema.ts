import { z } from 'zod';

const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

const logFormatSchema = z.enum(['json', 'pretty']);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  APP_NAME: z.string().min(1).default('NexorAIOS'),
  APP_VERSION: z.string().min(1).default('0.0.0'),

  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  DATABASE_READ_URL: z.string().url().startsWith('postgresql://').optional(),
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  REDIS_URL: z.string().min(1),
  REDIS_TLS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  LOG_LEVEL: logLevelSchema.default('info'),
  LOG_FORMAT: logFormatSchema.default('json'),
  LOG_REDACT_PATHS: z.string().default('password,token,secret,authorization,cookie'),

  OTEL_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  OTEL_SERVICE_NAME: z.string().min(1).default('nexoraios'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),

  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  SENTRY_ENVIRONMENT: z.string().min(1).default('development'),

  JWT_SECRET: z.string().min(32).optional(),
});

export type Env = z.infer<typeof envSchema>;

export type EnvInput = z.input<typeof envSchema>;

export function parseEnv(input: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(input);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return result.data;
}

export function parseEnvOrThrow(input: Record<string, string | undefined> = process.env): Env {
  return parseEnv(input);
}

export { envSchema as nexorEnvSchema };
