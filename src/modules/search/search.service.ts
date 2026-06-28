import { Inject, Injectable } from '@nestjs/common';
import { sql, eq, and, gte, lte, count } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { researches } from '../../database/schema/researches.js';
import { researchAuthors } from '../../database/schema/research-authors.js';
import { researchCategories } from '../../database/schema/research-categories.js';
import { researchKeywords } from '../../database/schema/research-keywords.js';
import { authors } from '../../database/schema/authors.js';

@Injectable()
export class SearchService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async search(params: {
    q?: string;
    category?: string;
    keyword?: string;
    author?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    page: number;
    limit: number;
  }) {
    const { q, category, keyword, dateFrom, dateTo, sort, page, limit } =
      params;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(researches.status, 'approved'),
      eq(researches.uploadComplete, true),
    ];

    if (dateFrom) conditions.push(gte(researches.publishDate, dateFrom));
    if (dateTo) conditions.push(lte(researches.publishDate, dateTo));

    let query = this.db
      .select({
        id: researches.id,
        title: researches.title,
        abstract: researches.abstract,
        publishDate: researches.publishDate,
        viewCount: researches.viewCount,
        downloadCount: researches.downloadCount,
        citationCount: researches.citationCount,
        createdAt: researches.createdAt,
        ...(q
          ? {
              rank: sql<number>`ts_rank_cd(${researches.searchVector}, plainto_tsquery('english', ${q}))`.as(
                'rank',
              ),
            }
          : {}),
      })
      .from(researches)
      .$dynamic();

    if (category) {
      query = query.innerJoin(
        researchCategories,
        and(
          eq(researchCategories.researchId, researches.id),
          eq(researchCategories.categoryId, category),
        ),
      );
    }

    if (keyword) {
      query = query.innerJoin(
        researchKeywords,
        and(
          eq(researchKeywords.researchId, researches.id),
          eq(researchKeywords.keywordId, keyword),
        ),
      );
    }

    if (params.author) {
      query = query.innerJoin(
        researchAuthors,
        and(
          eq(researchAuthors.researchId, researches.id),
          eq(researchAuthors.authorId, params.author),
        ),
      );
    }

    if (q) {
      conditions.push(
        sql`${researches.searchVector} @@ plainto_tsquery('english', ${q})`,
      );
    }

    const whereClause = and(...conditions);

    const orderBy =
      sort === 'date'
        ? sql`${researches.createdAt} DESC`
        : sort === 'views'
          ? sql`${researches.viewCount} DESC`
          : sort === 'downloads'
            ? sql`${researches.downloadCount} DESC`
            : q
              ? sql`rank DESC`
              : sql`${researches.createdAt} DESC`;

    const data = await (query as any)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Count query
    let countQuery = this.db
      .select({ total: count() })
      .from(researches)
      .$dynamic();

    if (category) {
      countQuery = countQuery.innerJoin(
        researchCategories,
        and(
          eq(researchCategories.researchId, researches.id),
          eq(researchCategories.categoryId, category),
        ),
      );
    }

    if (keyword) {
      countQuery = countQuery.innerJoin(
        researchKeywords,
        and(
          eq(researchKeywords.researchId, researches.id),
          eq(researchKeywords.keywordId, keyword),
        ),
      );
    }

    if (params.author) {
      countQuery = countQuery.innerJoin(
        researchAuthors,
        and(
          eq(researchAuthors.researchId, researches.id),
          eq(researchAuthors.authorId, params.author),
        ),
      );
    }

    const [{ total }] = await (countQuery as any).where(whereClause);

    return {
      data,
      meta: { total, page, totalPages: Math.ceil(total / limit) },
    };
  }

  async suggestions(q: string) {
    if (!q || q.length < 2) return [];

    const results = await this.db
      .select({
        id: researches.id,
        title: researches.title,
        similarity: sql<number>`similarity(${researches.title}, ${q})`.as(
          'sim',
        ),
      })
      .from(researches)
      .where(
        and(
          eq(researches.status, 'approved'),
          eq(researches.uploadComplete, true),
          sql`similarity(${researches.title}, ${q}) > 0.1`,
        ),
      )
      .orderBy(sql`sim DESC`)
      .limit(5);

    // Also search authors
    const authorResults = await this.db
      .select({ id: authors.id, name: authors.name })
      .from(authors)
      .where(sql`similarity(${authors.name}, ${q}) > 0.1`)
      .orderBy(sql`similarity(${authors.name}, ${q}) DESC`)
      .limit(3);

    return {
      researches: results,
      authors: authorResults,
    };
  }
}
