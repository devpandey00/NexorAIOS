import pino from 'pino';
import { getRequestContext } from './context.js';
import type { Logger, LoggerOptions, LogMetadata } from './types.js';

function buildRedactPaths(customPaths: string[] = []): string[] {
  const defaults = [
    'password',
    'token',
    'secret',
    'authorization',
    'cookie',
    'req.headers.authorization',
    'req.headers.cookie',
  ];

  return [...new Set([...defaults, ...customPaths])];
}

function enrichWithContext(meta: LogMetadata): LogMetadata {
  const context = getRequestContext();

  if (!context) {
    return meta;
  }

  return {
    ...meta,
    correlationId: context.correlationId,
    requestId: context.requestId,
    organizationId: context.organizationId,
    userId: context.userId,
  };
}

function wrapPinoLogger(pinoLogger: pino.Logger): Logger {
  const log =
    (level: pino.Level) =>
    (metaOrMessage: LogMetadata | string, message?: string): void => {
      if (typeof metaOrMessage === 'string') {
        pinoLogger[level](enrichWithContext({}), metaOrMessage);
        return;
      }

      pinoLogger[level](enrichWithContext(metaOrMessage), message ?? '');
    };

  return {
    fatal: log('fatal'),
    error: log('error'),
    warn: log('warn'),
    info: log('info'),
    debug: log('debug'),
    trace: log('trace'),
    child: (bindings: LogMetadata) => wrapPinoLogger(pinoLogger.child(bindings)),
  };
}

export function createLogger(options: LoggerOptions): Logger {
  const transport =
    options.format === 'pretty' && options.environment !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined;

  const pinoLogger = pino({
    name: options.name,
    level: options.level ?? 'info',
    redact: {
      paths: buildRedactPaths(options.redactPaths),
      censor: '[REDACTED]',
    },
    base: {
      service: options.name,
      version: options.version,
      environment: options.environment,
    },
    ...(transport ? { transport } : {}),
  });

  return wrapPinoLogger(pinoLogger);
}

let rootLogger: Logger | undefined;

export function getLogger(): Logger {
  if (!rootLogger) {
    rootLogger = createLogger({
      name: process.env['APP_NAME'] ?? 'nexoraios',
      level: (process.env['LOG_LEVEL'] as LoggerOptions['level']) ?? 'info',
      format: (process.env['LOG_FORMAT'] as LoggerOptions['format']) ?? 'json',
      environment: process.env['NODE_ENV'] ?? 'development',
      version: process.env['APP_VERSION'] ?? '0.0.0',
      redactPaths: process.env['LOG_REDACT_PATHS']?.split(',').map((p) => p.trim()),
    });
  }

  return rootLogger;
}

export function setRootLogger(logger: Logger): void {
  rootLogger = logger;
}
