import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PdfRequestService } from './pdf-request.service.js';
import { CreatePdfRequestDto } from './dto/create-pdf-request.dto.js';

@ApiTags('PDF Requests')
@Controller('pdf-requests')
export class PdfRequestController {
  constructor(private service: PdfRequestService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a PDF access request' })
  create(@Body() dto: CreatePdfRequestDto) {
    return this.service.create(dto);
  }

  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({ summary: "List PDF requests for user's researches" })
  findMy(@CurrentUser('id') userId: string) {
    return this.service.findMyRequests(userId);
  }

  @ApiBearerAuth()
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve PDF request' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.approve(id, userId);
  }

  @ApiBearerAuth()
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject PDF request' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reject(id, userId);
  }
}
