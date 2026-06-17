import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, count, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { categories } from '../../database/schema/categories.js';
import { researchCategories } from '../../database/schema/research-categories.js';
import { researches } from '../../database/schema/researches.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';

@Injectable()
export class CategoryService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async findAll() {
    const result = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        researchCount: count(researchCategories.researchId),
      })
      .from(categories)
      .leftJoin(
        researchCategories,
        eq(categories.id, researchCategories.categoryId),
      )
      .groupBy(categories.id)
      .orderBy(categories.name);

    return result;
  }

  async findByIdWithResearches(id: string, page: number, limit: number) {
    const category = await this.db.query.categories.findFirst({
      where: eq(categories.id, id),
    });
    if (!category) throw new NotFoundException('Category not found');

    const offset = (page - 1) * limit;

    const data = await this.db
      .select({ research: researches })
      .from(researchCategories)
      .innerJoin(researches, eq(researchCategories.researchId, researches.id))
      .where(
        and(
          eq(researchCategories.categoryId, id),
          eq(researches.status, 'approved'),
        ),
      )
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(researchCategories)
      .innerJoin(researches, eq(researchCategories.researchId, researches.id))
      .where(
        and(
          eq(researchCategories.categoryId, id),
          eq(researches.status, 'approved'),
        ),
      );

    return {
      data: { ...category, researches: data.map((d) => d.research) },
      meta: { total, page, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateCategoryDto) {
    try {
      const [cat] = await this.db.insert(categories).values(dto).returning();
      return cat;
    } catch (e: any) {
      if (e.code === '23505')
        throw new ConflictException('Category already exists');
      throw e;
    }
  }

  async update(id: string, dto: CreateCategoryDto) {
    const [updated] = await this.db
      .update(categories)
      .set(dto)
      .where(eq(categories.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Category not found');
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id });
    if (!deleted) throw new NotFoundException('Category not found');
    return { message: 'Category deleted' };
  }
}
