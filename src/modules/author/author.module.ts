import { Module } from '@nestjs/common';
import { AuthorController } from './author.controller.js';
import { AuthorService } from './author.service.js';

@Module({
  controllers: [AuthorController],
  providers: [AuthorService],
})
export class AuthorModule {}
