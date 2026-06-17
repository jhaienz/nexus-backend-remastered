import { Inject, Injectable } from '@nestjs/common';
import { eq, sql, count, sum, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { researches } from '../../database/schema/researches.js';
import { users } from '../../database/schema/users.js';
import { analyticsEvents } from '../../database/schema/analytics-events.js';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async adminOverview() {
    const [researchCount] = await this.db
      .select({ total: count() })
      .from(researches);
    const [userCount] = await this.db.select({ total: count() }).from(users);
    const [stats] = await this.db
      .select({
        totalViews: sum(researches.viewCount),
        totalDownloads: sum(researches.downloadCount),
        totalCitations: sum(researches.citationCount),
      })
      .from(researches);

    return {
      totalResearches: researchCount.total,
      totalUsers: userCount.total,
      totalViews: Number(stats.totalViews ?? 0),
      totalDownloads: Number(stats.totalDownloads ?? 0),
      totalCitations: Number(stats.totalCitations ?? 0),
    };
  }

  async adminTrends(period: string, metric: string) {
    const truncExpr =
      period === 'weekly'
        ? sql`date_trunc('week', ${analyticsEvents.createdAt})`
        : period === 'monthly'
          ? sql`date_trunc('month', ${analyticsEvents.createdAt})`
          : sql`date_trunc('day', ${analyticsEvents.createdAt})`;

    const eventType =
      metric === 'downloads'
        ? 'download'
        : metric === 'citations'
          ? 'citation'
          : 'view';

    const data = await this.db
      .select({
        date: truncExpr.as('date'),
        count: count(),
      })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.eventType, eventType))
      .groupBy(sql`date`)
      .orderBy(sql`date DESC`)
      .limit(30);

    return data;
  }

  async adminUploadsByRole() {
    const data = await this.db
      .select({
        role: users.role,
        uploads: count(researches.id),
      })
      .from(researches)
      .innerJoin(users, eq(researches.uploaderId, users.id))
      .groupBy(users.role);

    return data;
  }

  async userOverview(userId: string) {
    const [stats] = await this.db
      .select({
        totalResearches: count(),
        totalViews: sum(researches.viewCount),
        totalDownloads: sum(researches.downloadCount),
        totalCitations: sum(researches.citationCount),
      })
      .from(researches)
      .where(eq(researches.uploaderId, userId));

    return {
      totalResearches: stats.totalResearches,
      totalViews: Number(stats.totalViews ?? 0),
      totalDownloads: Number(stats.totalDownloads ?? 0),
      totalCitations: Number(stats.totalCitations ?? 0),
    };
  }

  async userTrends(userId: string, period: string, metric: string) {
    const truncExpr =
      period === 'weekly'
        ? sql`date_trunc('week', ${analyticsEvents.createdAt})`
        : period === 'monthly'
          ? sql`date_trunc('month', ${analyticsEvents.createdAt})`
          : sql`date_trunc('day', ${analyticsEvents.createdAt})`;

    const eventType =
      metric === 'downloads'
        ? 'download'
        : metric === 'citations'
          ? 'citation'
          : 'view';

    const data = await this.db
      .select({
        date: truncExpr.as('date'),
        count: count(),
      })
      .from(analyticsEvents)
      .innerJoin(researches, eq(analyticsEvents.researchId, researches.id))
      .where(
        and(
          eq(analyticsEvents.eventType, eventType),
          eq(researches.uploaderId, userId),
        ),
      )
      .groupBy(sql`date`)
      .orderBy(sql`date DESC`)
      .limit(30);

    return data;
  }
}
