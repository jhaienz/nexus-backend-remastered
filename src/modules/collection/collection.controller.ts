import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CollectionService } from './collection.service.js';
import { AddToCollectionDto } from './dto/add-to-collection.dto.js';

@ApiTags('Collections')
@ApiBearerAuth()
@Controller('collections')
export class CollectionController {
  constructor(private service: CollectionService) {}

  @Get()
  @ApiOperation({ summary: "Get current user's collection" })
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add research to collection' })
  add(@CurrentUser('id') userId: string, @Body() dto: AddToCollectionDto) {
    return this.service.add(userId, dto.researchId);
  }

  @Delete(':researchId')
  @ApiOperation({ summary: 'Remove from collection' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('researchId', ParseUUIDPipe) researchId: string,
  ) {
    return this.service.remove(userId, researchId);
  }
}
