export interface DomainEventMetadata {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  source: string;
}

export interface DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly type: string;
  readonly version: number;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly payload: TPayload;
  readonly metadata: DomainEventMetadata;
  readonly occurredAt: Date;
}

export interface DomainEventHandler<T extends DomainEvent = DomainEvent> {
  readonly eventType: string;
  handle(event: T): Promise<void>;
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}

export interface EventSubscriber {
  subscribe<T extends DomainEvent>(eventType: string, handler: DomainEventHandler<T>): void;

  unsubscribe(eventType: string, handler: DomainEventHandler): void;
}

export abstract class BaseDomainEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> implements DomainEvent<TPayload> {
  readonly id: string;
  readonly version: number;
  readonly occurredAt: Date;

  constructor(
    readonly type: string,
    readonly aggregateId: string,
    readonly aggregateType: string,
    readonly payload: TPayload,
    readonly metadata: DomainEventMetadata,
    options?: {
      id?: string;
      version?: number;
      occurredAt?: Date;
    },
  ) {
    this.id = options?.id ?? crypto.randomUUID();
    this.version = options?.version ?? 1;
    this.occurredAt = options?.occurredAt ?? new Date();
  }
}

export function createEventMetadata(
  partial: Partial<DomainEventMetadata> & Pick<DomainEventMetadata, 'source'>,
): DomainEventMetadata {
  return {
    ...(partial.correlationId !== undefined ? { correlationId: partial.correlationId } : {}),
    ...(partial.requestId !== undefined ? { requestId: partial.requestId } : {}),
    ...(partial.userId !== undefined ? { userId: partial.userId } : {}),
    ...(partial.organizationId !== undefined ? { organizationId: partial.organizationId } : {}),
    ...(partial.ipAddress !== undefined ? { ipAddress: partial.ipAddress } : {}),
    ...(partial.userAgent !== undefined ? { userAgent: partial.userAgent } : {}),
    source: partial.source,
  };
}
