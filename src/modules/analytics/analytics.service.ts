import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { researches, downloads, citations, views, searchLogs, users } from '../../database/schema';
import { eq, count, desc, sql, and } from 'drizzle-orm';

@Injectable()
export class AnalyticsService {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  async topDownloads(limit = 10) {
    const data = await this.db.select({
      researchId: downloads.researchId,
      title: researches.title,
      downloadCount: count(),
    }).from(downloads)
      .innerJoin(researches, eq(downloads.researchId, researches.id))
      .groupBy(downloads.researchId, researches.title)
      .orderBy(desc(count()))
      .limit(limit);
    return { data };
  }

  async trending(limit = 10) {
    const data = await this.db.select({
      researchId: searchLogs.researchId,
      title: researches.title,
      searchCount: count(),
    }).from(searchLogs)
      .innerJoin(researches, eq(searchLogs.researchId!, researches.id))
      .groupBy(searchLogs.researchId, researches.title)
      .orderBy(desc(count()))
      .limit(limit);
    return { data };
  }

  async mostCited(limit = 3) {
    const data = await this.db.select({
      researchId: citations.researchId,
      title: researches.title,
      citationCount: count(),
    }).from(citations)
      .innerJoin(researches, eq(citations.researchId, researches.id))
      .groupBy(citations.researchId, researches.title)
      .orderBy(desc(count()))
      .limit(limit);
    return { data };
  }

  async mostViewed(limit = 3) {
    const data = await this.db.select({
      researchId: researches.id,
      title: researches.title,
      viewCount: researches.viewCount,
    }).from(researches)
      .orderBy(desc(researches.viewCount))
      .limit(limit);
    return { data };
  }

  async totals() {
    const [researchCount] = await this.db.select({ count: count() }).from(researches);
    const [userCount] = await this.db.select({ count: count() }).from(users);
    const [downloadCount] = await this.db.select({ count: count() }).from(downloads);
    const [citationCount] = await this.db.select({ count: count() }).from(citations);
    const [viewData] = await this.db.select({ total: sql<number>`COALESCE(SUM(view_count), 0)` }).from(researches);

    return {
      totalResearches: Number(researchCount.count),
      totalUsers: Number(userCount.count),
      totalDownloads: Number(downloadCount.count),
      totalCitations: Number(citationCount.count),
      totalViews: Number(viewData.total),
    };
  }

  async timeSeries(metric: string, granularity: 'daily' | 'weekly' | 'monthly', startDate?: string, endDate?: string) {
    const table = metric === 'downloads' ? downloads : metric === 'citations' ? citations : views;
    const dateCol = table.datetime;

    const conditions: any[] = [];
    if (startDate) conditions.push(sql`${dateCol} >= ${new Date(startDate)}`);
    if (endDate) conditions.push(sql`${dateCol} <= ${new Date(endDate)}`);

    const data = await this.db.select({
      count: count(),
      datetime: dateCol,
    }).from(table)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(dateCol)
      .orderBy(dateCol);

    return { data };
  }

  async userStats(userId: number) {
    const [researchCount] = await this.db.select({ count: count() })
      .from(researches).where(eq(researches.uploaderId, userId));

    return {
      totalResearches: Number(researchCount.count),
    };
  }
}
