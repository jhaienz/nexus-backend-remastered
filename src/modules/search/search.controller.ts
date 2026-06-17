import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { SearchService } from './search.service.js';

@ApiTags('Search')
@Public()
@Controller('search')
export class SearchController {
  constructor(private service: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Full-text search with filters' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'author', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['relevance', 'date', 'views', 'downloads'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  search(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('author') author?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.search({
      q,
      category,
      keyword,
      author,
      dateFrom,
      dateTo,
      sort,
      page: parseInt(page || '1', 10),
      limit: Math.min(parseInt(limit || '20', 10), 100),
    });
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Autocomplete suggestions' })
  @ApiQuery({ name: 'q', required: true })
  suggestions(@Query('q') q: string) {
    return this.service.suggestions(q);
  }
}
