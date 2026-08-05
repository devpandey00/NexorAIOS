import { describe, expect, it } from 'vitest';
import { createRequestContext, runWithContext, getCorrelationId } from './context.js';

describe('RequestContext', () => {
  it('propagates correlation ID through async local storage', () => {
    const context = createRequestContext({
      correlationId: 'corr-123',
      requestId: 'req-456',
    });

    runWithContext(context, () => {
      expect(getCorrelationId()).toBe('corr-123');
    });

    expect(getCorrelationId()).toBeUndefined();
  });
});
