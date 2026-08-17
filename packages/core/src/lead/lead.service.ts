import { leadRepository, type LeadFilters } from '@nexor/database';
import type { Prisma } from '@prisma/client';

export class LeadService {
  create(data: Prisma.LeadCreateInput) { return leadRepository.create(data); }
  findOrCreate(data: Prisma.LeadCreateInput) {
    return leadRepository.findPotentialDuplicate({ businessName: data.businessName, website: data.website ?? undefined, email: data.email ?? undefined, whatsapp: data.whatsapp ?? undefined }).then((existing) => existing ?? leadRepository.create(data));
  }
  findAll(filters: LeadFilters = {}) { return leadRepository.findMany(filters); }
  findById(id: string) { return leadRepository.findById(id); }
  update(id: string, data: Prisma.LeadUpdateInput) { return leadRepository.update(id, data); }
  delete(id: string) { return leadRepository.delete(id); }
}

export const leadService = new LeadService();
