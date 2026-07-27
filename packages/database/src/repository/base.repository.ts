import type { PrismaClient } from '../client/index.js';
import { getReadClient, getWriteClient } from '../transaction/index.js';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface SoftDeletable {
  deletedAt: Date | null;
}

export interface RepositoryContext {
  organizationId?: string;
}

export abstract class BaseRepository {
  protected get writeClient(): PrismaClient {
    return getWriteClient();
  }

  protected get readClient(): PrismaClient {
    return getReadClient();
  }

  protected getPaginationParams(params: PaginationParams): {
    skip: number;
    take: number;
    page: number;
    pageSize: number;
  } {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    return { skip, take: pageSize, page, pageSize };
  }

  protected buildPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  protected notDeletedFilter(): { deletedAt: null } {
    return { deletedAt: null };
  }
}

export type { PaginatedResult as RepositoryPaginatedResult };
