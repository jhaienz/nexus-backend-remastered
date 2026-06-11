import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/validation.pipe';
import { SearchQueryDto, type SearchQueryDtoType } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  async search(@Query(new ZodValidationPipe(SearchQueryDto)) query: SearchQueryDtoType) {
    return this.searchService.search(query.q, query.category, query.author, query.page, query.limit);
  }

  @Post('log')
  @HttpCode(HttpStatus.OK)
  async logSearch(@Body('researchId') researchId: number, @Body('query') query?: string) {
    return this.searchService.logSearch(researchId, query);
  }
}
