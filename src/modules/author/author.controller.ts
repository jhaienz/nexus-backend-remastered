import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { AuthorService } from './author.service.js';

@ApiTags('Authors')
@Public()
@Controller('authors')
export class AuthorController {
  constructor(private service: AuthorService) {}

  @Get()
  @ApiOperation({ summary: 'List authors with paper count' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query() query: PaginationDto, @Query('search') search?: string) {
    return this.service.findAll(query.page!, query.limit!, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get author detail' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Get(':id/papers')
  @ApiOperation({ summary: "Get author's approved papers" })
  findPapers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.findPapers(id, query.page!, query.limit!);
  }
}
