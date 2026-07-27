export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export type LogFormat = 'json' | 'pretty';

export interface LoggerOptions {
  name: string;
  level?: LogLevel;
  format?: LogFormat;
  redactPaths?: string[];
  version?: string;
  environment?: string;
}

export interface LogMetadata {
  [key: string]: unknown;
}

export interface Logger {
  fatal(meta: LogMetadata, message: string): void;
  fatal(message: string): void;
  error(meta: LogMetadata, message: string): void;
  error(message: string): void;
  warn(meta: LogMetadata, message: string): void;
  warn(message: string): void;
  info(meta: LogMetadata, message: string): void;
  info(message: string): void;
  debug(meta: LogMetadata, message: string): void;
  debug(message: string): void;
  trace(meta: LogMetadata, message: string): void;
  trace(message: string): void;
  child(bindings: LogMetadata): Logger;
}

export interface ObservabilityConfig {
  otelEnabled: boolean;
  otelServiceName: string;
  otelExporterEndpoint?: string;
  sentryDsn?: string;
  sentryEnvironment?: string;
}

export interface ObservabilityProvider {
  initialize(config: ObservabilityConfig): Promise<void>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;
}
