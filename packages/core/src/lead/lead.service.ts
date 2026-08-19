import { leadRepository, type LeadFilters } from '@nexor/database';
import type { Prisma } from '@prisma/client';

export class LeadService {
  create(data: Prisma.LeadCreateInput) { return leadRepository.create(data); }

  findOrCreate(data: Prisma.LeadCreateInput) {
    const duplicateInput = {
      businessName: data.businessName,
      ...(data.website ? { website: data.website } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.whatsapp ? { whatsapp: data.whatsapp } : {}),
    };
    return leadRepository.findPotentialDuplicate(duplicateInput).then(
      (existing) => existing ?? leadRepository.create(data),
    );
  }

  findAll(filters: LeadFilters = {}) { return leadRepository.findMany(filters); }
  findById(id: string) { return leadRepository.findById(id); }
  update(id: string, data: Prisma.LeadUpdateInput) { return leadRepository.update(id, data); }
  delete(id: string) { return leadRepository.delete(id); }
}

export const leadService = new LeadService();
