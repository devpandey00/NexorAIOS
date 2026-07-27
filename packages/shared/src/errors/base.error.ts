import { ErrorCode } from './error-codes.js';

export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface NexorErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
    correlationId?: string;
    requestId?: string;
    timestamp: string;
    path?: string;
  };
}

export interface NexorSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    correlationId?: string;
    requestId?: string;
    timestamp: string;
  };
}

export type NexorApiResponse<T> = NexorSuccessResponse<T> | NexorErrorResponse;

export interface NexorErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: ErrorDetail[];
  cause?: unknown;
  isOperational?: boolean;
}

export class NexorError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: ErrorDetail[];
  readonly isOperational: boolean;
  override readonly cause?: unknown;

  constructor(options: NexorErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'NexorError';
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): NexorErrorResponse['error'] {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

export function isNexorError(error: unknown): error is NexorError {
  return error instanceof NexorError;
}

export function createValidationError(message: string, details?: ErrorDetail[]): NexorError {
  return new NexorError({
    code: ErrorCode.VALIDATION_ERROR,
    message,
    statusCode: 400,
    details,
  });
}

export function createNotFoundError(resource: string, identifier?: string): NexorError {
  const message = identifier
    ? `${resource} with identifier '${identifier}' was not found`
    : `${resource} was not found`;

  return new NexorError({
    code: ErrorCode.NOT_FOUND,
    message,
    statusCode: 404,
  });
}

export function createInternalError(message: string, cause?: unknown): NexorError {
  return new NexorError({
    code: ErrorCode.INTERNAL_ERROR,
    message,
    statusCode: 500,
    cause,
    isOperational: false,
  });
}
