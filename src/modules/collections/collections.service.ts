import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { collections, researches } from '../../database/schema';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class CollectionsService {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  async findByUser(userId: number) {
    const data = await this.db.select({
      researchId: collections.researchId,
      title: researches.title,
      abstract: researches.abstract,
    }).from(collections)
      .innerJoin(researches, eq(collections.researchId, researches.id))
      .where(eq(collections.userId, userId));
    return { data };
  }

  async add(userId: number, researchId: number) {
    await this.db.insert(collections).values({ userId, researchId }).onConflictDoNothing();
    return { message: 'Added to collection' };
  }

  async remove(userId: number, researchId: number) {
    await this.db.delete(collections).where(
      and(eq(collections.userId, userId), eq(collections.researchId, researchId)),
    );
    return { message: 'Removed from collection' };
  }
}
