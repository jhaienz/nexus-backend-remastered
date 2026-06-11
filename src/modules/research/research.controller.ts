import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ResearchService } from './research.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/validation.pipe';
import { CreateResearchDto, type CreateResearchDtoType } from './dto/create-research.dto';
import { UpdateResearchDto, type UpdateResearchDtoType } from './dto/update-research.dto';
import { ResearchQueryDto, type ResearchQueryDtoType } from './dto/research-query.dto';

@Controller('researches')
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateResearchDto)) dto: CreateResearchDtoType,
    @CurrentUser('id') uploaderId: number,
  ) {
    return this.researchService.create(dto, uploaderId);
  }

  @Public()
  @Get()
  async findAll(@Query(new ZodValidationPipe(ResearchQueryDto)) query: ResearchQueryDtoType) {
    return this.researchService.findAll(query);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.researchService.findOne(Number(id));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateResearchDto)) dto: UpdateResearchDtoType,
  ) {
    return this.researchService.update(Number(id), dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.researchService.remove(Number(id));
  }

  @Patch(':id/privacy')
  async updatePrivacy(
    @Param('id') id: string,
    @Body('privacy') privacy: 'public' | 'private',
  ) {
    return this.researchService.updatePrivacy(Number(id), privacy);
  }

  @Public()
  @Post(':id/download')
  @HttpCode(HttpStatus.OK)
  async download(@Param('id') id: string) {
    return this.researchService.recordDownload(Number(id));
  }

  @Public()
  @Post(':id/cite')
  @HttpCode(HttpStatus.OK)
  async cite(@Param('id') id: string) {
    return this.researchService.recordCitation(Number(id));
  }

  @Public()
  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  async view(@Param('id') id: string) {
    return this.researchService.recordView(Number(id));
  }
}
