import { describe, expect, it } from 'vitest';
import { ErrorCode } from '../src/errors/error-codes.js';
import { NexorError, createNotFoundError, isNexorError } from '../src/errors/base.error.js';

describe('NexorError', () => {
  it('creates operational errors with correct properties', () => {
    const error = new NexorError({
      code: ErrorCode.NOT_FOUND,
      message: 'Resource not found',
      statusCode: 404,
    });

    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
    expect(isNexorError(error)).toBe(true);
  });

  it('creates not found errors via factory', () => {
    const error = createNotFoundError('User', '123');
    expect(error.message).toContain('User');
    expect(error.message).toContain('123');
  });
});
