import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { ResearchService } from './research.service.js';
import { CreateResearchDto } from './dto/create-research.dto.js';
import { UpdateResearchDto } from './dto/update-research.dto.js';
import { UploadUrlDto } from './dto/upload-url.dto.js';
import { RejectResearchDto } from './dto/reject-research.dto.js';
import { UpdatePrivacyDto } from './dto/update-privacy.dto.js';
import type { CurrentAuthUser } from './research.service.js';

@ApiTags('Research')
@Controller('research')
export class ResearchController {
  constructor(private service: ResearchService) {}

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create research (metadata only)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateResearchDto) {
    return this.service.create(userId, dto);
  }

  @ApiBearerAuth()
  @Post(':id/upload-url')
  @ApiOperation({ summary: 'Get presigned R2 upload URL' })
  getUploadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UploadUrlDto,
  ) {
    return this.service.getUploadUrl(id, userId, dto.filename, dto.contentType);
  }

  @ApiBearerAuth()
  @Post(':id/confirm-upload')
  @ApiOperation({ summary: 'Confirm upload completed' })
  confirmUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.confirmUpload(id, userId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List approved researches' })
  findApproved(@Query() query: PaginationDto) {
    return this.service.findApproved(query.page!, query.limit!);
  }

  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({ summary: "List current user's researches" })
  findMyResearches(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.findMyResearches(userId, query.page!, query.limit!);
  }

  @ApiBearerAuth()
  @Get('pending')
  @Roles('admin')
  @ApiOperation({ summary: 'List pending researches (admin)' })
  findPending(@Query() query: PaginationDto) {
    return this.service.findPending(query.page!, query.limit!);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get research by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: CurrentAuthUser,
  ) {
    return this.service.findById(id, user);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update own research metadata' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateResearchDto,
  ) {
    return this.service.update(id, userId, dto);
  }

  @ApiBearerAuth()
  @Patch(':id/privacy')
  @ApiOperation({ summary: 'Toggle file privacy' })
  updatePrivacy(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePrivacyDto,
  ) {
    return this.service.updatePrivacy(id, userId, dto.filePrivacy);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete own research' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.remove(id, userId);
  }

  @ApiBearerAuth()
  @Patch(':id/approve')
  @Roles('admin')
  @ApiOperation({ summary: 'Approve pending research (admin)' })
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.approve(id);
  }

  @ApiBearerAuth()
  @Patch(':id/reject')
  @Roles('admin')
  @ApiOperation({ summary: 'Reject research with reason (admin)' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectResearchDto,
  ) {
    return this.service.reject(id, dto.reason);
  }

  @Public()
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Get presigned PDF download URL' })
  getPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: CurrentAuthUser,
  ) {
    return this.service.getPdfUrl(id, user);
  }

  @Public()
  @Post(':id/view')
  @ApiOperation({ summary: 'Track view event' })
  trackView(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.trackEvent(id, 'view');
  }

  @Public()
  @Post(':id/download')
  @ApiOperation({ summary: 'Track download event' })
  trackDownload(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.trackEvent(id, 'download');
  }

  @Public()
  @Post(':id/cite')
  @ApiOperation({ summary: 'Track citation event' })
  trackCitation(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.trackEvent(id, 'citation');
  }
}
