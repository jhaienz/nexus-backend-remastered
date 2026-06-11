import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { roles } from '../../database/schema/roles.schema';
import { programs } from '../../database/schema/programs.schema';
import { authors } from '../../database/schema/authors.schema';
import { researchAuthors } from '../../database/schema/research-authors.schema';
import { researches } from '../../database/schema/researches.schema';
import { eq, count, ilike, and, inArray } from 'drizzle-orm';

@Injectable()
export class ReferenceService {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  async getRoles() {
    return this.db.select().from(roles);
  }

  async getPrograms() {
    return this.db.select().from(programs);
  }

  async getAuthors(page = 1, limit = 50, search?: string) {
    const offset = (page - 1) * limit;

    const where = search ? ilike(authors.name, `%${search}%`) : undefined;

    const [data, [{ count: total }]] = await Promise.all([
      this.db.select().from(authors).where(where).limit(limit).offset(offset),
      this.db.select({ count: count() }).from(authors).where(where),
    ]);

    const enriched = await Promise.all(data.map(async (author) => {
      const [{ count: documentCount }] = await this.db.select({ count: count() })
        .from(researchAuthors)
        .where(eq(researchAuthors.authorId, author.id));
      return { ...author, documentCount: Number(documentCount) };
    }));

    return {
      data: enriched,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    };
  }

  async getAuthor(id: number) {
    const [author] = await this.db.select().from(authors).where(eq(authors.id, id));
    return author ?? null;
  }

  async getAuthorResearches(authorId: number, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const authorResearchIds = this.db.select({ id: researchAuthors.researchId })
      .from(researchAuthors)
      .where(eq(researchAuthors.authorId, authorId));

    const [data, [{ count: total }]] = await Promise.all([
      this.db.select().from(researches)
        .where(and(eq(researches.status, 'approved'), inArray(researches.id, authorResearchIds)))
        .limit(limit).offset(offset),
      this.db.select({ count: count() }).from(researches)
        .where(and(eq(researches.status, 'approved'), inArray(researches.id, authorResearchIds))),
    ]);

    return {
      data,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    };
  }
}
