import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { pdfRequests } from '../../database/schema/pdf-requests.js';
import { researches } from '../../database/schema/researches.js';
import { StorageService } from '../storage/storage.service.js';
import { EmailService } from '../email/email.service.js';
import { CreatePdfRequestDto } from './dto/create-pdf-request.dto.js';

@Injectable()
export class PdfRequestService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private storage: StorageService,
    private email: EmailService,
  ) {}

  async create(dto: CreatePdfRequestDto) {
    const research = await this.db.query.researches.findFirst({
      where: eq(researches.id, dto.researchId),
      with: { uploader: { columns: { email: true } } },
    });

    if (!research) throw new NotFoundException('Research not found');

    const [request] = await this.db
      .insert(pdfRequests)
      .values({
        researchId: dto.researchId,
        requesterName: dto.name,
        requesterEmail: dto.email,
        purpose: dto.purpose,
      })
      .returning();

    // Notify the uploader
    if (research.uploader?.email) {
      await this.email.sendPdfRequestNotification(
        research.uploader.email,
        dto.name,
        research.title,
      );
    }

    return request;
  }

  async findMyRequests(userId: string) {
    return this.db
      .select({
        request: pdfRequests,
        research: {
          id: researches.id,
          title: researches.title,
        },
      })
      .from(pdfRequests)
      .innerJoin(researches, eq(pdfRequests.researchId, researches.id))
      .where(eq(researches.uploaderId, userId))
      .orderBy(pdfRequests.createdAt);
  }

  async approve(requestId: string, userId: string) {
    const request = await this.getOwnedRequest(requestId, userId);

    const research = await this.db.query.researches.findFirst({
      where: eq(researches.id, request.researchId),
    });

    if (!research?.fileKey) throw new BadRequestException('No PDF uploaded');

    // 24-hour download link
    const downloadUrl = await this.storage.generateDownloadUrl(
      research.fileKey,
      86400,
    );

    await this.db
      .update(pdfRequests)
      .set({ status: 'approved' })
      .where(eq(pdfRequests.id, requestId));

    await this.email.sendPdfApproval(
      request.requesterEmail,
      downloadUrl,
      research.title,
    );

    return { message: 'Request approved, email sent' };
  }

  async reject(requestId: string, userId: string) {
    const request = await this.getOwnedRequest(requestId, userId);

    const research = await this.db.query.researches.findFirst({
      where: eq(researches.id, request.researchId),
    });

    await this.db
      .update(pdfRequests)
      .set({ status: 'rejected' })
      .where(eq(pdfRequests.id, requestId));

    await this.email.sendPdfRejection(
      request.requesterEmail,
      research?.title ?? 'Unknown',
    );

    return { message: 'Request rejected, email sent' };
  }

  private async getOwnedRequest(requestId: string, userId: string) {
    const [result] = await this.db
      .select({ request: pdfRequests })
      .from(pdfRequests)
      .innerJoin(researches, eq(pdfRequests.researchId, researches.id))
      .where(
        and(eq(pdfRequests.id, requestId), eq(researches.uploaderId, userId)),
      );

    if (!result) throw new NotFoundException('Request not found');
    return result.request;
  }
}
