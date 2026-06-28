import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { keywords } from '../../database/schema/keywords.js';
import { CreateKeywordDto } from './dto/create-keyword.dto.js';

const CACHE_KEY = 'keywords:all';

@Injectable()
export class KeywordService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async findAll() {
    const cached = await this.cache.get<object[]>(CACHE_KEY);
    if (cached) return cached;

    const result = await this.db.select().from(keywords).orderBy(keywords.name);
    await this.cache.set(CACHE_KEY, result);
    return result;
  }

  private invalidate() {
    return this.cache.del(CACHE_KEY);
  }

  async create(dto: CreateKeywordDto) {
    try {
      const [kw] = await this.db.insert(keywords).values(dto).returning();
      await this.invalidate();
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
    await this.invalidate();
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db
      .delete(keywords)
      .where(eq(keywords.id, id))
      .returning({ id: keywords.id });
    if (!deleted) throw new NotFoundException('Keyword not found');
    await this.invalidate();
    return { message: 'Keyword deleted' };
  }
}
