import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import {
  researches, users, categories, keywords, institutions,
  researchAuthors, authors,
} from '../../database/schema';
import { eq, and, count, ilike, SQL, desc } from 'drizzle-orm';

@Injectable()
export class AdminService {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  async getPendingResearches(page = 1, limit = 20) {
    return this.getResearchesByStatus('pending', page, limit);
  }

  async getRejectedResearches(page = 1, limit = 20) {
    return this.getResearchesByStatus('rejected', page, limit);
  }

  async approveResearch(id: number) {
    await this.db.update(researches).set({ status: 'approved', updatedAt: new Date() }).where(eq(researches.id, id));
    return { message: 'Research approved successfully' };
  }

  async rejectResearch(id: number, reason?: string) {
    await this.db.update(researches).set({ status: 'rejected', updatedAt: new Date() }).where(eq(researches.id, id));
    return { message: 'Research rejected. Notification sent to uploader.' };
  }

  async getUploaderStats() {
    const rows = await this.db.select({
      roleId: users.roleId,
      uploads: count(),
    }).from(researches)
      .innerJoin(users, eq(researches.uploaderId, users.id))
      .groupBy(users.roleId);
    return { data: rows };
  }

  async getAllCategories() {
    const data = await this.db.select().from(categories);
    return { data };
  }

  async createCategory(name: string) {
    const [category] = await this.db.insert(categories).values({ name }).returning();
    return category;
  }

  async updateCategory(id: number, name: string) {
    const [category] = await this.db.update(categories).set({ name }).where(eq(categories.id, id)).returning();
    return { message: 'Category updated' };
  }

  async deleteCategory(id: number) {
    await this.db.delete(categories).where(eq(categories.id, id));
    return { message: 'Category deleted' };
  }

  async getAllKeywords() {
    const data = await this.db.select().from(keywords);
    return { data };
  }

  async createKeyword(name: string) {
    const [keyword] = await this.db.insert(keywords).values({ name }).returning();
    return keyword;
  }

  async updateKeyword(id: number, name: string) {
    await this.db.update(keywords).set({ name }).where(eq(keywords.id, id));
    return { message: 'Keyword updated' };
  }

  async deleteKeyword(id: number) {
    await this.db.delete(keywords).where(eq(keywords.id, id));
    return { message: 'Keyword deleted' };
  }

  async getAllInstitutions() {
    const data = await this.db.select().from(institutions);
    return { data };
  }

  async createInstitution(name: string) {
    const [institution] = await this.db.insert(institutions).values({ name }).returning();
    return institution;
  }

  async updateInstitution(id: number, name: string) {
    await this.db.update(institutions).set({ name }).where(eq(institutions.id, id));
    return { message: 'Institution updated' };
  }

  async deleteInstitution(id: number) {
    await this.db.delete(institutions).where(eq(institutions.id, id));
    return { message: 'Institution deleted' };
  }

  private async getResearchesByStatus(status: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const [data, [{ count: total }]] = await Promise.all([
      this.db.select().from(researches).where(eq(researches.status, status)).orderBy(desc(researches.createdAt)).limit(limit).offset(offset),
      this.db.select({ count: count() }).from(researches).where(eq(researches.status, status)),
    ]);
    return { data, meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) } };
  }
}
