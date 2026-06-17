import { Module } from '@nestjs/common';
import { KeywordController } from './keyword.controller.js';
import { KeywordService } from './keyword.service.js';

@Module({
  controllers: [KeywordController],
  providers: [KeywordService],
})
export class KeywordModule {}
