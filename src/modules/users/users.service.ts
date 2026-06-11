import { Inject, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { users } from '../../database/schema';
import { eq, and, ilike, count, SQL, asc, desc } from 'drizzle-orm';
import { PgColumn } from 'drizzle-orm/pg-core';

const SORTABLE_COLUMNS: Record<string, PgColumn> = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  lastActive: users.lastActive,
  isVerified: users.isVerified,
};

@Injectable()
export class UsersService {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async findById(id: number) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async create(data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    email: string;
    password: string;
    roleId: number;
    programId?: number;
    institutionId?: number;
  }) {
    const existing = await this.findByEmail(data.email);
    if (existing) throw new ConflictException('Email already registered');

    const [user] = await this.db.insert(users).values({
      firstName: data.firstName,
      middleName: data.middleName ?? null,
      lastName: data.lastName,
      suffix: data.suffix ?? null,
      email: data.email,
      password: data.password,
      roleId: data.roleId,
      programId: data.programId ?? null,
      institutionId: data.institutionId ?? null,
    }).returning();
    return user;
  }

  async update(id: number, data: Partial<{
    firstName: string;
    middleName: string | null;
    lastName: string;
    suffix: string | null;
    email: string;
    password: string;
    roleId: number;
    programId: number | null;
    institutionId: number | null;
    isVerified: boolean;
    profilePictureKey: string | null;
    lastActive: Date;
  }>) {
    const [user] = await this.db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: number) {
    const [user] = await this.db.delete(users).where(eq(users.id, id)).returning();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (params.search) {
      conditions.push(ilike(users.email, `%${params.search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn = params.sortBy ? SORTABLE_COLUMNS[params.sortBy] : undefined;
    const orderBy = sortColumn
      ? (params.order === 'desc' ? desc(sortColumn) : asc(sortColumn))
      : desc(users.createdAt);

    const [data, [{ count: total }]] = await Promise.all([
      this.db.select().from(users).where(where).orderBy(orderBy).limit(limit).offset(offset),
      this.db.select({ count: count() }).from(users).where(where),
    ]);

    return {
      data,
      meta: {
        total: Number(total),
        page,
        limit,
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }
}
