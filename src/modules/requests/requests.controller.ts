import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Public()
  @Post('pdf')
  async create(@Body() body: { researchId: number; researchTitle?: string; requesterName: string; requesterEmail: string; purpose?: string }) {
    return this.requestsService.create(body);
  }

  @Get('pdf')
  async findAll() {
    return this.requestsService.findByUser(0);
  }

  @Patch('pdf/:id/approve')
  async approve(@Param('id') id: string) {
    return this.requestsService.approve(Number(id));
  }

  @Patch('pdf/:id/reject')
  async reject(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.requestsService.reject(Number(id), reason);
  }
}
