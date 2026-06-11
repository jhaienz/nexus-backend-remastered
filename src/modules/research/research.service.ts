import { Inject, Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import {
  researches, researchAuthors, researchCategories, researchKeywords,
  authors, categories, keywords, downloads, citations, views,
} from '../../database/schema';
import { eq, and, desc, asc, count, ilike, inArray, SQL, sql } from 'drizzle-orm';
import type { CreateResearchDtoType } from './dto/create-research.dto';
import type { UpdateResearchDtoType } from './dto/update-research.dto';
import type { ResearchQueryDtoType } from './dto/research-query.dto';

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    @Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>,
  ) {}

  async create(dto: CreateResearchDtoType, uploaderId: number) {
    const [research] = await this.db.insert(researches).values({
      title: dto.title,
      abstract: dto.abstract ?? null,
      uploaderId,
      filePrivacy: dto.filePrivacy,
    }).returning();

    await this.upsertAuthors(research.id, dto.authors);
    await this.upsertCategories(research.id, dto.categories ?? []);
    await this.upsertKeywords(research.id, dto.keywords ?? []);

    return research;
  }

  async findAll(query: ResearchQueryDtoType) {
    const { page, limit, category, keyword, author, search, sortBy, order } = query;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(researches.status, 'approved')];

    if (category) {
      const rcSubquery = this.db.select({ researchId: researchCategories.researchId })
        .from(researchCategories)
        .where(eq(researchCategories.categoryId, category));
      conditions.push(inArray(researches.id, rcSubquery));
    }
    if (keyword) {
      const rkSubquery = this.db.select({ researchId: researchKeywords.researchId })
        .from(researchKeywords)
        .where(eq(researchKeywords.keywordId, keyword));
      conditions.push(inArray(researches.id, rkSubquery));
    }
    if (author) {
      const raSubquery = this.db.select({ researchId: researchAuthors.researchId })
        .from(researchAuthors)
        .where(eq(researchAuthors.authorId, author));
      conditions.push(inArray(researches.id, raSubquery));
    }

    const orderBy = this.buildOrderBy(sortBy, order);

    let [data, [{ count: total }]] = await Promise.all([
      this.db.select().from(researches).where(and(...conditions)).orderBy(orderBy).limit(limit).offset(offset),
      this.db.select({ count: count() }).from(researches).where(and(...conditions)),
    ]);

    const enriched = await Promise.all(data.map((r) => this.enrichResearch(r)));

    return {
      data: enriched,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    };
  }

  async findOne(id: number) {
    const [research] = await this.db.select().from(researches).where(eq(researches.id, id));
    if (!research) throw new NotFoundException('Research not found');
    return this.enrichResearch(research);
  }

  async update(id: number, dto: UpdateResearchDtoType) {
    const [research] = await this.db.select().from(researches).where(eq(researches.id, id));
    if (!research) throw new NotFoundException('Research not found');

    const updateData: Record<string, unknown> = {};
    if (dto.title) updateData.title = dto.title;
    if (dto.abstract !== undefined) updateData.abstract = dto.abstract;
    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length > 1) {
      await this.db.update(researches).set(updateData).where(eq(researches.id, id));
    }

    if (dto.authors) {
      await this.db.delete(researchAuthors).where(eq(researchAuthors.researchId, id));
      await this.upsertAuthors(id, dto.authors);
    }
    if (dto.categories) {
      await this.db.delete(researchCategories).where(eq(researchCategories.researchId, id));
      await this.upsertCategories(id, dto.categories);
    }
    if (dto.keywords) {
      await this.db.delete(researchKeywords).where(eq(researchKeywords.researchId, id));
      await this.upsertKeywords(id, dto.keywords);
    }

    return { message: 'Research updated successfully' };
  }

  async remove(id: number) {
    const [research] = await this.db.delete(researches).where(eq(researches.id, id)).returning();
    if (!research) throw new NotFoundException('Research not found');
    return { message: 'Research deleted successfully', fileKey: research.fileKey };
  }

  async updatePrivacy(id: number, privacy: 'public' | 'private') {
    const [research] = await this.db.update(researches)
      .set({ filePrivacy: privacy, updatedAt: new Date() })
      .where(eq(researches.id, id))
      .returning();
    if (!research) throw new NotFoundException('Research not found');
    return { message: `Privacy updated to ${privacy}` };
  }

  async recordDownload(id: number) {
    await this.db.insert(downloads).values({ researchId: id });
    return { message: 'Download counted' };
  }

  async recordCitation(id: number) {
    await this.db.insert(citations).values({ researchId: id });
    return { message: 'Citation counted' };
  }

  async recordView(id: number) {
    await this.db.insert(views).values({ researchId: id });
    await this.db.update(researches).set({ viewCount: sql`view_count + 1` }).where(eq(researches.id, id));
    return { message: 'View counted' };
  }

  private async upsertAuthors(researchId: number, authorList: { name: string; email?: string }[]) {
    for (const a of authorList) {
      const [existing] = await this.db.select().from(authors).where(eq(authors.name, a.name));
      let authorId: number;
      if (existing) {
        authorId = existing.id;
      } else {
        const [created] = await this.db.insert(authors).values({ name: a.name, email: a.email ?? null }).returning();
        authorId = created.id;
      }
      await this.db.insert(researchAuthors).values({ researchId, authorId }).onConflictDoNothing();
    }
  }

  private async upsertCategories(researchId: number, nameList: string[]) {
    for (const name of nameList) {
      const [existing] = await this.db.select().from(categories).where(eq(categories.name, name));
      let categoryId: number;
      if (existing) {
        categoryId = existing.id;
      } else {
        const [created] = await this.db.insert(categories).values({ name }).returning();
        categoryId = created.id;
      }
      await this.db.insert(researchCategories).values({ researchId, categoryId }).onConflictDoNothing();
    }
  }

  private async upsertKeywords(researchId: number, nameList: string[]) {
    for (const name of nameList) {
      const [existing] = await this.db.select().from(keywords).where(eq(keywords.name, name));
      let keywordId: number;
      if (existing) {
        keywordId = existing.id;
      } else {
        const [created] = await this.db.insert(keywords).values({ name }).returning();
        keywordId = created.id;
      }
      await this.db.insert(researchKeywords).values({ researchId, keywordId }).onConflictDoNothing();
    }
  }

  private async enrichResearch(research: typeof researches.$inferSelect) {
    const authorRows = await this.db.select({
      id: authors.id, name: authors.name, email: authors.email,
    }).from(researchAuthors)
      .innerJoin(authors, eq(researchAuthors.authorId, authors.id))
      .where(eq(researchAuthors.researchId, research.id));

    const categoryRows = await this.db.select({ name: categories.name })
      .from(researchCategories)
      .innerJoin(categories, eq(researchCategories.categoryId, categories.id))
      .where(eq(researchCategories.researchId, research.id));

    const keywordRows = await this.db.select({ name: keywords.name })
      .from(researchKeywords)
      .innerJoin(keywords, eq(researchKeywords.keywordId, keywords.id))
      .where(eq(researchKeywords.researchId, research.id));

    const [{ count: totalDownloads }] = await this.db.select({ count: count() })
      .from(downloads).where(eq(downloads.researchId, research.id));
    const [{ count: totalCitations }] = await this.db.select({ count: count() })
      .from(citations).where(eq(citations.researchId, research.id));

    return {
      ...research,
      authors: authorRows,
      categories: categoryRows.map((c) => c.name),
      keywords: keywordRows.map((k) => k.name),
      totalDownloads: Number(totalDownloads),
      totalCitations: Number(totalCitations),
    };
  }

  private buildOrderBy(sortBy?: string, order?: 'asc' | 'desc') {
    const dir = order === 'asc' ? asc : desc;
    switch (sortBy) {
      case 'title': return dir(researches.title);
      case 'date': return dir(researches.publishDate);
      default: return dir(researches.createdAt);
    }
  }
}
