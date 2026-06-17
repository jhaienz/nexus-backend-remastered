import { Inject, Injectable } from '@nestjs/common';
import { eq, and, count } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { notifications } from '../../database/schema/notifications.js';

@Injectable()
export class NotificationService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async findByUser(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [data, [{ total }]] = await Promise.all([
      this.db.query.notifications.findMany({
        where: eq(notifications.userId, userId),
        with: { research: { columns: { id: true, title: true } } },
        limit,
        offset,
        orderBy: (n, { desc }) => [desc(n.createdAt)],
      }),
      this.db
        .select({ total: count() })
        .from(notifications)
        .where(eq(notifications.userId, userId)),
    ]);

    return {
      data,
      meta: { total, page, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAllRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.read, false)),
      );
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.read, false)),
      );
    return { count: total };
  }
}
