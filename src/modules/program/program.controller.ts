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
import { ProgramService } from './program.service.js';
import { CreateProgramDto } from './dto/create-program.dto.js';

@ApiTags('Programs')
@Controller('programs')
export class ProgramController {
  constructor(private service: ProgramService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all programs' })
  findAll() {
    return this.service.findAll();
  }

  @ApiBearerAuth()
  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create program (admin)' })
  create(@Body() dto: CreateProgramDto) {
    return this.service.create(dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update program (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramDto,
  ) {
    return this.service.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete program (admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
