import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { institutions } from '../../database/schema/institutions.js';
import { CreateInstitutionDto } from './dto/create-institution.dto.js';

@Injectable()
export class InstitutionService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async findAll() {
    return this.db.select().from(institutions).orderBy(institutions.name);
  }

  async create(dto: CreateInstitutionDto) {
    try {
      const [inst] = await this.db.insert(institutions).values(dto).returning();
      return inst;
    } catch (e: any) {
      if (e.code === '23505')
        throw new ConflictException('Institution already exists');
      throw e;
    }
  }

  async update(id: string, dto: CreateInstitutionDto) {
    const [updated] = await this.db
      .update(institutions)
      .set(dto)
      .where(eq(institutions.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Institution not found');
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db
      .delete(institutions)
      .where(eq(institutions.id, id))
      .returning({ id: institutions.id });
    if (!deleted) throw new NotFoundException('Institution not found');
    return { message: 'Institution deleted' };
  }
}
