import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { keywords } from '../../database/schema/keywords.js';
import { CreateKeywordDto } from './dto/create-keyword.dto.js';

@Injectable()
export class KeywordService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async findAll() {
    return this.db.select().from(keywords).orderBy(keywords.name);
  }

  async create(dto: CreateKeywordDto) {
    try {
      const [kw] = await this.db.insert(keywords).values(dto).returning();
      return kw;
    } catch (e: any) {
      if (e.code === '23505')
        throw new ConflictException('Keyword already exists');
      throw e;
    }
  }

  async update(id: string, dto: CreateKeywordDto) {
    const [updated] = await this.db
      .update(keywords)
      .set(dto)
      .where(eq(keywords.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Keyword not found');
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db
      .delete(keywords)
      .where(eq(keywords.id, id))
      .returning({ id: keywords.id });
    if (!deleted) throw new NotFoundException('Keyword not found');
    return { message: 'Keyword deleted' };
  }
}
