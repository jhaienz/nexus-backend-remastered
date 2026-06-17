import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { programs } from '../../database/schema/programs.js';
import { CreateProgramDto } from './dto/create-program.dto.js';

@Injectable()
export class ProgramService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async findAll() {
    return this.db.select().from(programs).orderBy(programs.name);
  }

  async create(dto: CreateProgramDto) {
    try {
      const [prog] = await this.db.insert(programs).values(dto).returning();
      return prog;
    } catch (e: any) {
      if (e.code === '23505')
        throw new ConflictException('Program already exists');
      throw e;
    }
  }

  async update(id: string, dto: CreateProgramDto) {
    const [updated] = await this.db
      .update(programs)
      .set(dto)
      .where(eq(programs.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Program not found');
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db
      .delete(programs)
      .where(eq(programs.id, id))
      .returning({ id: programs.id });
    if (!deleted) throw new NotFoundException('Program not found');
    return { message: 'Program deleted' };
  }
}
