import { LeadStatus } from '@prisma/client';
import type { Lead, Prisma } from '@prisma/client';

import { BaseRepository, type PaginatedResult, type PaginationParams } from './base.repository.js';

export interface LeadFilters extends PaginationParams {
  search?: string;
  status?: LeadStatus;
  country?: string;
  niche?: string;
}

export class LeadRepository extends BaseRepository {
  async create(data: Prisma.LeadCreateInput): Promise<Lead> {
    return this.writeClient.lead.create({
      data,
    });
  }

  async findById(id: string): Promise<Lead | null> {
    return this.readClient.lead.findUnique({
      where: { id },
    });
  }

  async findMany(filters: LeadFilters = {}): Promise<PaginatedResult<Lead>> {
    const { skip, take, page, pageSize } = this.getPaginationParams(filters);

    const where: Prisma.LeadWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.country) {
      where.country = filters.country;
    }

    if (filters.niche) {
      where.niche = filters.niche;
    }

    if (filters.search) {
      where.OR = [
        {
          businessName: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          ownerName: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [data, total] = await this.readClient.$transaction([
      this.readClient.lead.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.readClient.lead.count({
        where,
      }),
    ]);

    return this.buildPaginatedResult(data, total, page, pageSize);
  }

  async update(id: string, data: Prisma.LeadUpdateInput): Promise<Lead> {
    return this.writeClient.lead.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Lead> {
    return this.writeClient.lead.delete({
      where: { id },
    });
  }

  async changeStatus(id: string, status: LeadStatus): Promise<Lead> {
    return this.writeClient.lead.update({
      where: { id },
      data: {
        status,
      },
    });
  }

  async count(): Promise<number> {
    return this.readClient.lead.count();
  }

  async exists(id: string): Promise<boolean> {
    const lead = await this.readClient.lead.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    return lead !== null;
  }
}

export const leadRepository = new LeadRepository();
