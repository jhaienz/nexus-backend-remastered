import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findByUser(userId, page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Patch('read')
  async markAllRead(
    @Body('ids') ids: number[],
    @CurrentUser('id') userId: number,
  ) {
    return this.notificationsService.markAsRead(ids, userId);
  }

  @Patch(':id/read')
  async markOneRead(@Param('id') id: string, @CurrentUser('id') userId: number) {
    return this.notificationsService.markOneAsRead(Number(id), userId);
  }
}
