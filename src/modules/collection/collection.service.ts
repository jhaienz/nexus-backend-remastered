import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { collections } from '../../database/schema/collections.js';

@Injectable()
export class CollectionService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async findByUser(userId: string) {
    return this.db.query.collections.findMany({
      where: eq(collections.userId, userId),
      with: {
        research: {
          with: {
            researchAuthors: { with: { author: true } },
            researchCategories: { with: { category: true } },
          },
        },
      },
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    });
  }

  async add(userId: string, researchId: string) {
    try {
      await this.db.insert(collections).values({ userId, researchId });
      return { message: 'Added to collection' };
    } catch (e: any) {
      if (e.code === '23505')
        throw new ConflictException('Already in collection');
      throw e;
    }
  }

  async remove(userId: string, researchId: string) {
    const [deleted] = await this.db
      .delete(collections)
      .where(
        and(
          eq(collections.userId, userId),
          eq(collections.researchId, researchId),
        ),
      )
      .returning();
    if (!deleted) throw new NotFoundException('Not in collection');
    return { message: 'Removed from collection' };
  }
}
