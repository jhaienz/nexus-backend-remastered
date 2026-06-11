import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('researches/pending')
  async getPending(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getPendingResearches(page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Get('researches/rejected')
  async getRejected(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getRejectedResearches(page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Patch('researches/:id/approve')
  async approve(@Param('id') id: string) {
    return this.adminService.approveResearch(Number(id));
  }

  @Patch('researches/:id/reject')
  async reject(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectResearch(Number(id), reason);
  }

  @Get('uploader-stats')
  async uploaderStats() {
    return this.adminService.getUploaderStats();
  }

  @Get('categories')
  async getCategories() {
    return this.adminService.getAllCategories();
  }

  @Post('categories')
  async createCategory(@Body('name') name: string) {
    return this.adminService.createCategory(name);
  }

  @Patch('categories/:id')
  async updateCategory(@Param('id') id: string, @Body('name') name: string) {
    return this.adminService.updateCategory(Number(id), name);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(Number(id));
  }

  @Get('keywords')
  async getKeywords() {
    return this.adminService.getAllKeywords();
  }

  @Post('keywords')
  async createKeyword(@Body('name') name: string) {
    return this.adminService.createKeyword(name);
  }

  @Patch('keywords/:id')
  async updateKeyword(@Param('id') id: string, @Body('name') name: string) {
    return this.adminService.updateKeyword(Number(id), name);
  }

  @Delete('keywords/:id')
  async deleteKeyword(@Param('id') id: string) {
    return this.adminService.deleteKeyword(Number(id));
  }

  @Get('institutions')
  async getInstitutions() {
    return this.adminService.getAllInstitutions();
  }

  @Post('institutions')
  async createInstitution(@Body('name') name: string) {
    return this.adminService.createInstitution(name);
  }

  @Patch('institutions/:id')
  async updateInstitution(@Param('id') id: string, @Body('name') name: string) {
    return this.adminService.updateInstitution(Number(id), name);
  }

  @Delete('institutions/:id')
  async deleteInstitution(@Param('id') id: string) {
    return this.adminService.deleteInstitution(Number(id));
  }
}
