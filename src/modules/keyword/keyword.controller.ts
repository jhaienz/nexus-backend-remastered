import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { KeywordService } from './keyword.service.js';
import { CreateKeywordDto } from './dto/create-keyword.dto.js';

@ApiTags('Keywords')
@Controller('keywords')
export class KeywordController {
  constructor(private service: KeywordService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all keywords' })
  findAll() {
    return this.service.findAll();
  }

  @ApiBearerAuth()
  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create keyword (admin)' })
  create(@Body() dto: CreateKeywordDto) {
    return this.service.create(dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update keyword (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateKeywordDto,
  ) {
    return this.service.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete keyword (admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
