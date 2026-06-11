import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Get('top-downloads')
  async topDownloads(@Query('limit') limit?: string) {
    return this.analyticsService.topDownloads(limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('trending')
  async trending(@Query('limit') limit?: string) {
    return this.analyticsService.trending(limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('most-cited')
  async mostCited() {
    return this.analyticsService.mostCited();
  }

  @Public()
  @Get('most-viewed')
  async mostViewed() {
    return this.analyticsService.mostViewed();
  }

  @Public()
  @Get('totals')
  async totals() {
    return this.analyticsService.totals();
  }

  @Public()
  @Get(':metric')
  async timeSeries(
    @Param('metric') metric: string,
    @Query('granularity') granularity: 'daily' | 'weekly' | 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.timeSeries(metric, granularity ?? 'daily', startDate, endDate);
  }

  @Get('user/:userId')
  async userStats(@Param('userId') userId: string) {
    return this.analyticsService.userStats(Number(userId));
  }
}
