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
import { InstitutionService } from './institution.service.js';
import { CreateInstitutionDto } from './dto/create-institution.dto.js';

@ApiTags('Institutions')
@Controller('institutions')
export class InstitutionController {
  constructor(private service: InstitutionService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all institutions' })
  findAll() {
    return this.service.findAll();
  }

  @ApiBearerAuth()
  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create institution (admin)' })
  create(@Body() dto: CreateInstitutionDto) {
    return this.service.create(dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update institution (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInstitutionDto,
  ) {
    return this.service.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete institution (admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
