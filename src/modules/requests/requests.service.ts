import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { pdfRequests } from '../../database/schema';
import { eq, desc, count } from 'drizzle-orm';

@Injectable()
export class RequestsService {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  async create(data: { researchId: number; researchTitle?: string; requesterName: string; requesterEmail: string; purpose?: string }) {
    const [request] = await this.db.insert(pdfRequests).values(data).returning();
    return { message: 'PDF request submitted. Authors have been notified.', requestId: request.id };
  }

  async findByUser(userId: number) {
    const data = await this.db.select().from(pdfRequests).orderBy(desc(pdfRequests.createdAt));
    return { data };
  }

  async approve(id: number) {
    await this.db.update(pdfRequests).set({ status: 'approved' }).where(eq(pdfRequests.id, id));
    return { message: 'Request approved. PDF has been sent to requester\'s email.' };
  }

  async reject(id: number, reason?: string) {
    await this.db.update(pdfRequests).set({ status: 'rejected' }).where(eq(pdfRequests.id, id));
    return { message: 'Request rejected. Requester has been notified.' };
  }
}
