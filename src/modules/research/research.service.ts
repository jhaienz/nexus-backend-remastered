import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, count, sql, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { researches } from '../../database/schema/researches.js';
import { authors } from '../../database/schema/authors.js';
import { researchAuthors } from '../../database/schema/research-authors.js';
import { researchCategories } from '../../database/schema/research-categories.js';
import { researchKeywords } from '../../database/schema/research-keywords.js';
import { analyticsEvents } from '../../database/schema/analytics-events.js';
import { notifications } from '../../database/schema/notifications.js';
import { StorageService } from '../storage/storage.service.js';
import { CreateResearchDto } from './dto/create-research.dto.js';
import { UpdateResearchDto } from './dto/update-research.dto.js';

export type CurrentAuthUser = { id: string; email: string; role: string };

@Injectable()
export class ResearchService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private storage: StorageService,
  ) {}

  async create(uploaderId: string, dto: CreateResearchDto) {
    return this.db.transaction(async (tx) => {
      const [research] = await tx
        .insert(researches)
        .values({
          title: dto.title,
          abstract: dto.abstract,
          publishDate: dto.publishDate,
          uploaderId,
        })
        .returning();

      // Upsert authors and link
      if (dto.authors?.length) {
        for (const a of dto.authors) {
          const [author] = await tx
            .insert(authors)
            .values({ name: a.name, email: a.email })
            .onConflictDoUpdate({
              target: [authors.name, authors.email],
              set: { name: a.name },
            })
            .returning();

          await tx.insert(researchAuthors).values({
            researchId: research.id,
            authorId: author.id,
          });
        }
      }

      // Link categories
      if (dto.categoryIds?.length) {
        await tx.insert(researchCategories).values(
          dto.categoryIds.map((categoryId) => ({
            researchId: research.id,
            categoryId,
          })),
        );
      }

      // Link keywords
      if (dto.keywordIds?.length) {
        await tx.insert(researchKeywords).values(
          dto.keywordIds.map((keywordId) => ({
            researchId: research.id,
            keywordId,
          })),
        );
      }

      return { id: research.id };
    });
  }

  async getUploadUrl(
    researchId: string,
    userId: string,
    filename: string,
    contentType: string,
  ) {
    const research = await this.assertOwnership(researchId, userId);
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `pdfs/${research.id}/${Date.now()}-${safeFilename}`;
    const uploadUrl = await this.storage.generateUploadUrl(key, contentType);

    await this.db
      .update(researches)
      .set({
        fileKey: key,
        fileName: safeFilename,
        uploadComplete: false,
        updatedAt: new Date(),
      })
      .where(eq(researches.id, researchId));

    return { uploadUrl, key };
  }

  async confirmUpload(researchId: string, userId: string) {
    const research = await this.assertOwnership(researchId, userId);
    if (!research.fileKey) throw new NotFoundException('No file key set');

    const exists = await this.storage.objectExists(research.fileKey);
    if (!exists) throw new NotFoundException('File not found in storage');

    await this.db
      .update(researches)
      .set({ uploadComplete: true, updatedAt: new Date() })
      .where(eq(researches.id, researchId));

    return { message: 'Upload confirmed' };
  }

  async findById(id: string, user?: CurrentAuthUser) {
    const research = await this.db.query.researches.findFirst({
      where: eq(researches.id, id),
      with: {
        uploader: { columns: { passwordHash: false } },
        researchAuthors: { with: { author: true } },
        researchCategories: { with: { category: true } },
        researchKeywords: { with: { keyword: true } },
      },
    });
    if (!research) throw new NotFoundException('Research not found');

    const isOwner = user?.id === research.uploaderId;
    const isAdmin = user?.role === 'admin';
    if (research.status !== 'approved' && !isOwner && !isAdmin) {
      throw new NotFoundException('Research not found');
    }

    return {
      ...research,
      authors: research.researchAuthors.map((ra) => ra.author),
      categories: research.researchCategories.map((rc) => rc.category),
      keywords: research.researchKeywords.map((rk) => rk.keyword),
      researchAuthors: undefined,
      researchCategories: undefined,
      researchKeywords: undefined,
    };
  }

  async findApproved(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [data, [{ total }]] = await Promise.all([
      this.db.query.researches.findMany({
        where: and(
          eq(researches.status, 'approved'),
          eq(researches.uploadComplete, true),
        ),
        with: {
          researchAuthors: { with: { author: true } },
          researchCategories: { with: { category: true } },
        },
        limit,
        offset,
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      }),
      this.db
        .select({ total: count() })
        .from(researches)
        .where(
          and(
            eq(researches.status, 'approved'),
            eq(researches.uploadComplete, true),
          ),
        ),
    ]);

    return {
      data: data.map((r) => ({
        ...r,
        authors: r.researchAuthors.map((ra) => ra.author),
        categories: r.researchCategories.map((rc) => rc.category),
        researchAuthors: undefined,
        researchCategories: undefined,
      })),
      meta: { total, page, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyResearches(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [data, [{ total }]] = await Promise.all([
      this.db.query.researches.findMany({
        where: eq(researches.uploaderId, userId),
        limit,
        offset,
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      }),
      this.db
        .select({ total: count() })
        .from(researches)
        .where(eq(researches.uploaderId, userId)),
    ]);

    return {
      data,
      meta: { total, page, totalPages: Math.ceil(total / limit) },
    };
  }

  async findPending(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [data, [{ total }]] = await Promise.all([
      this.db.query.researches.findMany({
        where: eq(researches.status, 'pending'),
        with: {
          uploader: {
            columns: { id: true, email: true, firstName: true, lastName: true },
          },
          researchAuthors: { with: { author: true } },
        },
        limit,
        offset,
        orderBy: (r, { asc }) => [asc(r.createdAt)],
      }),
      this.db
        .select({ total: count() })
        .from(researches)
        .where(eq(researches.status, 'pending')),
    ]);

    return {
      data: data.map((r) => ({
        ...r,
        authors: r.researchAuthors.map((ra) => ra.author),
        researchAuthors: undefined,
      })),
      meta: { total, page, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(researchId: string, userId: string, dto: UpdateResearchDto) {
    await this.assertOwnership(researchId, userId);

    const [updated] = await this.db
      .update(researches)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(researches.id, researchId))
      .returning();

    return updated;
  }

  async updatePrivacy(
    researchId: string,
    userId: string,
    filePrivacy: 'public' | 'private',
  ) {
    await this.assertOwnership(researchId, userId);

    const [updated] = await this.db
      .update(researches)
      .set({ filePrivacy, updatedAt: new Date() })
      .where(eq(researches.id, researchId))
      .returning();

    return updated;
  }

  async remove(researchId: string, userId: string) {
    const research = await this.assertOwnership(researchId, userId);

    if (research.fileKey) {
      await this.storage.deleteObject(research.fileKey);
    }

    await this.db.delete(researches).where(eq(researches.id, researchId));
    return { message: 'Research deleted' };
  }

  async approve(researchId: string) {
    const existing = await this.db.query.researches.findFirst({
      where: eq(researches.id, researchId),
    });

    if (!existing) throw new NotFoundException('Research not found');
    if (!existing.uploadComplete || !existing.fileKey) {
      throw new BadRequestException(
        'Cannot approve research without a confirmed PDF upload',
      );
    }

    const [research] = await this.db
      .update(researches)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(researches.id, researchId))
      .returning();

    await this.db.insert(notifications).values({
      userId: research.uploaderId,
      researchId: research.id,
      message: `Your research "${research.title}" has been approved.`,
    });

    return research;
  }

  async reject(researchId: string, reason: string) {
    const [research] = await this.db
      .update(researches)
      .set({
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(researches.id, researchId))
      .returning();

    if (!research) throw new NotFoundException('Research not found');

    await this.db.insert(notifications).values({
      userId: research.uploaderId,
      researchId: research.id,
      message: `Your research "${research.title}" has been rejected. Reason: ${reason}`,
    });

    return research;
  }

  async getPdfUrl(researchId: string, user?: CurrentAuthUser) {
    const research = await this.db.query.researches.findFirst({
      where: eq(researches.id, researchId),
    });

    if (!research || !research.fileKey || !research.uploadComplete)
      throw new NotFoundException('PDF not found');

    const isOwner = user?.id === research.uploaderId;
    const isAdmin = user?.role === 'admin';

    if (research.status !== 'approved' && !isOwner && !isAdmin) {
      throw new NotFoundException('PDF not found');
    }

    if (research.filePrivacy === 'private' && !isOwner && !isAdmin) {
      throw new ForbiddenException('This PDF is private');
    }

    const url = await this.storage.generateDownloadUrl(research.fileKey);
    return { url };
  }

  async trackEvent(
    researchId: string,
    eventType: 'view' | 'download' | 'citation',
  ) {
    const research = await this.db.query.researches.findFirst({
      where: and(
        eq(researches.id, researchId),
        eq(researches.status, 'approved'),
        eq(researches.uploadComplete, true),
      ),
    });

    if (!research) throw new NotFoundException('Research not found');

    const counterColumn =
      eventType === 'view'
        ? researches.viewCount
        : eventType === 'download'
          ? researches.downloadCount
          : researches.citationCount;

    await Promise.all([
      this.db.insert(analyticsEvents).values({ researchId, eventType }),
      this.db
        .update(researches)
        .set({ [counterColumn.name]: sql`${counterColumn} + 1` })
        .where(eq(researches.id, researchId)),
    ]);

    return { message: `${eventType} tracked` };
  }

  private async assertOwnership(researchId: string, userId: string) {
    const research = await this.db.query.researches.findFirst({
      where: and(
        eq(researches.id, researchId),
        eq(researches.uploaderId, userId),
      ),
    });
    if (!research)
      throw new NotFoundException(
        'Research not found or you are not the owner',
      );
    return research;
  }
}
