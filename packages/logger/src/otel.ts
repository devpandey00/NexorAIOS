import type { ObservabilityConfig, ObservabilityProvider } from './types.js';

/**
 * OpenTelemetry and Sentry integration stub.
 * Actual SDK wiring will be added when observability stack is deployed.
 */
export class NoOpObservabilityProvider implements ObservabilityProvider {
  private initialized = false;

  initialize(_config: ObservabilityConfig): Promise<void> {
    this.initialized = true;
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    this.initialized = false;
    return Promise.resolve();
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export function createObservabilityProvider(): ObservabilityProvider {
  return new NoOpObservabilityProvider();
}

/**
 * Future integration point for OpenTelemetry auto-instrumentation.
 * Call this during application bootstrap when OTEL_ENABLED=true.
 */
export async function bootstrapObservability(
  config: ObservabilityConfig,
): Promise<ObservabilityProvider> {
  const provider = createObservabilityProvider();
  await provider.initialize(config);
  return provider;
}
