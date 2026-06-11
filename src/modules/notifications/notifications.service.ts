import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { notifications } from '../../database/schema';
import { eq, and, count, inArray, desc } from 'drizzle-orm';

@Injectable()
export class NotificationsService {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  async findByUser(userId: number, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [data, [{ count: total }]] = await Promise.all([
      this.db.select().from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit).offset(offset),
      this.db.select({ count: count() }).from(notifications)
        .where(eq(notifications.userId, userId)),
    ]);
    return { data, meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) } };
  }

  async markAsRead(ids?: number[], userId?: number) {
    const conditions = [];
    if (ids?.length) conditions.push(inArray(notifications.id, ids));
    if (userId) conditions.push(eq(notifications.userId, userId));

    const [result] = await this.db.update(notifications)
      .set({ opened: true })
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .returning();

    return { message: 'Notifications marked as read', affected: result ? 1 : 0 };
  }

  async markOneAsRead(id: number, userId: number) {
    const [notification] = await this.db.update(notifications)
      .set({ opened: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    if (!notification) throw new Error('Notification not found');
    return { message: 'Notification marked as read' };
  }
}
