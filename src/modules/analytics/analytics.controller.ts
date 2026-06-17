import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AnalyticsService } from './analytics.service.js';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('admin/overview')
  @Roles('admin')
  @ApiOperation({ summary: 'System-wide overview stats (admin)' })
  adminOverview() {
    return this.service.adminOverview();
  }

  @Get('admin/trends')
  @Roles('admin')
  @ApiOperation({ summary: 'Time-series trends (admin)' })
  @ApiQuery({ name: 'period', enum: ['daily', 'weekly', 'monthly'] })
  @ApiQuery({ name: 'metric', enum: ['views', 'downloads', 'citations'] })
  adminTrends(
    @Query('period') period: string,
    @Query('metric') metric: string,
  ) {
    return this.service.adminTrends(period, metric);
  }

  @Get('admin/uploads-by-role')
  @Roles('admin')
  @ApiOperation({ summary: 'Upload counts by user role (admin)' })
  adminUploadsByRole() {
    return this.service.adminUploadsByRole();
  }

  @Get('user/overview')
  @ApiOperation({ summary: "Current user's overview stats" })
  userOverview(@CurrentUser('id') userId: string) {
    return this.service.userOverview(userId);
  }

  @Get('user/trends')
  @ApiOperation({ summary: "Current user's trends" })
  @ApiQuery({ name: 'period', enum: ['daily', 'weekly', 'monthly'] })
  @ApiQuery({ name: 'metric', enum: ['views', 'downloads', 'citations'] })
  userTrends(
    @CurrentUser('id') userId: string,
    @Query('period') period: string,
    @Query('metric') metric: string,
  ) {
    return this.service.userTrends(userId, period, metric);
  }
}
