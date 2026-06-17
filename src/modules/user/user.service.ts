import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, count } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { users } from '../../database/schema/users.js';
import { StorageService } from '../storage/storage.service.js';
import { UpdateProfileDto, AdminUpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UserService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private storage: StorageService,
  ) {}

  async getProfile(userId: string) {
    const result = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { passwordHash: false },
      with: { institution: true, program: true },
    });
    if (!result) throw new NotFoundException('User not found');
    return result;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const [updated] = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!updated) throw new NotFoundException('User not found');
    const { passwordHash: _hash, ...user } = updated;
    return user;
  }

  async getProfilePictureUploadUrl(userId: string) {
    const key = `profile-pics/${userId}/${Date.now()}.jpg`;
    const uploadUrl = await this.storage.generateUploadUrl(key, 'image/jpeg');

    await this.db
      .update(users)
      .set({ profilePicKey: key, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { uploadUrl, key };
  }

  async findById(userId: string) {
    const result = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { passwordHash: false },
      with: { institution: true, program: true },
    });
    if (!result) throw new NotFoundException('User not found');
    return result;
  }

  async findAll(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [data, [{ total }]] = await Promise.all([
      this.db.query.users.findMany({
        columns: { passwordHash: false },
        with: { institution: true, program: true },
        limit,
        offset,
        orderBy: (u, { desc }) => [desc(u.createdAt)],
      }),
      this.db.select({ total: count() }).from(users),
    ]);

    return {
      data,
      meta: { total, page, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminUpdate(userId: string, dto: AdminUpdateUserDto) {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.middleName !== undefined) updateData.middleName = dto.middleName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.suffix !== undefined) updateData.suffix = dto.suffix;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.institutionId !== undefined)
      updateData.institutionId = dto.institutionId;
    if (dto.programId !== undefined) updateData.programId = dto.programId;
    if (dto.status !== undefined) updateData.status = dto.status;

    const [updated] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) throw new NotFoundException('User not found');
    const { passwordHash: _hash, ...user } = updated;
    return user;
  }

  async remove(userId: string) {
    const [deleted] = await this.db
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (!deleted) throw new NotFoundException('User not found');
    return { message: 'User deleted' };
  }
}
