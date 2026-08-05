import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  correlationId: string;
  requestId: string;
  organizationId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export async function runWithContextAsync<T>(
  context: RequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(context, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function createRequestContext(
  partial: Partial<RequestContext> & Pick<RequestContext, 'correlationId' | 'requestId'>,
): RequestContext {
  return {
    correlationId: partial.correlationId,
    requestId: partial.requestId,
    ...(partial.organizationId !== undefined ? { organizationId: partial.organizationId } : {}),
    ...(partial.userId !== undefined ? { userId: partial.userId } : {}),
    ...(partial.ipAddress !== undefined ? { ipAddress: partial.ipAddress } : {}),
    ...(partial.userAgent !== undefined ? { userAgent: partial.userAgent } : {}),
  };
}

export { storage as requestContextStorage };
