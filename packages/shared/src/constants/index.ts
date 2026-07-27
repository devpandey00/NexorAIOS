export const API_VERSION = 'v1' as const;

export const API_PREFIX = `/api/${API_VERSION}` as const;

export const DEFAULT_PAGE_SIZE = 20;

export const MAX_PAGE_SIZE = 100;

export const CORRELATION_ID_HEADER = 'x-correlation-id' as const;

export const REQUEST_ID_HEADER = 'x-request-id' as const;

export const ORGANIZATION_ID_HEADER = 'x-organization-id' as const;

export const SUPPORTED_LOCALES = ['en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
