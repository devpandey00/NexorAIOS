import { describe, expect, it } from 'vitest';
import { BaseRepository } from './base.repository.js';

class TestRepository extends BaseRepository {
  public paginate(params: { page?: number; pageSize?: number }) {
    return this.getPaginationParams(params);
  }

  public paginated<T>(data: T[], total: number, page: number, pageSize: number) {
    return this.buildPaginatedResult(data, total, page, pageSize);
  }
}

describe('BaseRepository', () => {
  const repo = new TestRepository();

  it('calculates pagination with defaults', () => {
    const result = repo.paginate({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('caps page size at 100', () => {
    const result = repo.paginate({ pageSize: 500 });
    expect(result.pageSize).toBe(100);
  });

  it('builds paginated results with metadata', () => {
    const result = repo.paginated(['a', 'b'], 50, 1, 20);
    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(50);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.hasNextPage).toBe(true);
  });
});
