import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: number) {
    return this.collectionsService.findByUser(userId);
  }

  @Post()
  async add(@CurrentUser('id') userId: number, @Body('researchId') researchId: number) {
    return this.collectionsService.add(userId, researchId);
  }

  @Delete(':researchId')
  async remove(@CurrentUser('id') userId: number, @Param('researchId') researchId: string) {
    return this.collectionsService.remove(userId, Number(researchId));
  }
}
