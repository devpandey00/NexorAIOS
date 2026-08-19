import { LeadStatus } from '@prisma/client';
import type { Lead, Prisma } from '@prisma/client';
import { BaseRepository, type PaginationParams } from './base.repository.js';

export interface LeadFilters extends PaginationParams { search?: string; status?: LeadStatus; country?: string; niche?: string; }

export class LeadRepository extends BaseRepository {
  create(data: Prisma.LeadCreateInput): Promise<Lead> { return this.writeClient.lead.create({ data }); }
  findById(id: string): Promise<Lead | null> { return this.readClient.lead.findUnique({ where: { id } }); }
  async findPotentialDuplicate(input: { businessName: string; website?: string; email?: string; whatsapp?: string }): Promise<Lead | null> {
    const candidates = [
      input.website ? { website: input.website } : null,
      input.email ? { email: input.email } : null,
      input.whatsapp ? { whatsapp: input.whatsapp } : null,
      { businessName: input.businessName },
    ].filter(Boolean) as Prisma.LeadWhereInput[];
    return this.readClient.lead.findFirst({ where: { OR: candidates }, orderBy: { createdAt: 'desc' } });
  }
  async findMany(filters: LeadFilters = {}) {
    const { skip, take, page, pageSize } = this.getPaginationParams(filters); const where: Prisma.LeadWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.country) where.country = filters.country;
    if (filters.niche) where.niche = filters.niche;
    if (filters.search) where.OR = [{ businessName: { contains: filters.search, mode: 'insensitive' } }, { ownerName: { contains: filters.search, mode: 'insensitive' } }, { email: { contains: filters.search, mode: 'insensitive' } }];
    const [data, total] = await this.readClient.$transaction([
      this.readClient.lead.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { socialProfiles: true } }),
      this.readClient.lead.count({ where }),
    ]);
    return this.buildPaginatedResult(data, total, page, pageSize);
  }
  update(id: string, data: Prisma.LeadUpdateInput): Promise<Lead> { return this.writeClient.lead.update({ where: { id }, data }); }
  delete(id: string): Promise<Lead> { return this.writeClient.lead.delete({ where: { id } }); }
  changeStatus(id: string, status: LeadStatus): Promise<Lead> { return this.writeClient.lead.update({ where: { id }, data: { status } }); }
  count(): Promise<number> { return this.readClient.lead.count(); }
  async exists(id: string): Promise<boolean> { return (await this.readClient.lead.findUnique({ where: { id }, select: { id: true } })) !== null; }
}

export const leadRepository = new LeadRepository();
