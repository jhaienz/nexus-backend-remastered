import { Module } from '@nestjs/common';
import { PdfRequestController } from './pdf-request.controller.js';
import { PdfRequestService } from './pdf-request.service.js';

@Module({
  controllers: [PdfRequestController],
  providers: [PdfRequestService],
})
export class PdfRequestModule {}
