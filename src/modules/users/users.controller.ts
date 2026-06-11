import {
  Controller, Get, Post, Body, Param, Patch, Delete, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('admin')
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.usersService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      sortBy,
      order,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(Number(id));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.usersService.update(Number(id), body);
  }

  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(Number(id));
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@CurrentUser('id') userId: number) {
    await this.usersService.update(userId, { lastActive: new Date() });
    return { message: 'Heartbeat updated' };
  }

  @Roles('admin')
  @Get('online')
  async getOnlineUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { data } = await this.usersService.findAll({ limit: 100 });
    const online = data.filter((u) => u.lastActive && u.lastActive > fiveMinutesAgo);
    return {
      onlineUsers: online.map((u) => ({
        id: u.id, firstName: u.firstName, lastName: u.lastName,
        email: u.email, lastActive: u.lastActive,
      })),
      count: online.length,
    };
  }
}
