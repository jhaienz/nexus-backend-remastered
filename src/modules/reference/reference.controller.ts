import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReferenceService } from './reference.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller()
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Public()
  @Get('roles')
  async getRoles() {
    const data = await this.referenceService.getRoles();
    return { data };
  }

  @Public()
  @Get('programs')
  async getPrograms() {
    const data = await this.referenceService.getPrograms();
    return { data };
  }

  @Public()
  @Get('authors')
  async getAuthors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.referenceService.getAuthors(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search,
    );
  }

  @Public()
  @Get('authors/:id')
  async getAuthor(@Param('id') id: string) {
    return this.referenceService.getAuthor(Number(id));
  }

  @Public()
  @Get('authors/:id/researches')
  async getAuthorResearches(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.referenceService.getAuthorResearches(
      Number(id),
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }
}
