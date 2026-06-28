import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AiRequestDto } from './dto/ai-request.dto.js';
import { GeminiService } from './gemini.service.js';

@ApiTags('AI')
@ApiBearerAuth()
@Roles('admin')
@Controller('ai')
export class GeminiController {
  constructor(private service: GeminiService) {}

  @Post('summarize')
  @ApiOperation({ summary: 'Summarize research abstract (admin only)' })
  async summarize(@Body() dto: AiRequestDto) {
    const result = await this.service.summarize(dto.title, dto.abstract);
    return { result };
  }

  @Post('suggest-rejection')
  @ApiOperation({ summary: 'Generate rejection feedback (admin only)' })
  async suggestRejection(@Body() dto: AiRequestDto) {
    const result = await this.service.suggestRejection(dto.title, dto.abstract);
    return { result };
  }

  @Post('suggest-tags')
  @ApiOperation({ summary: 'Suggest categories and keywords (admin only)' })
  async suggestTags(@Body() dto: AiRequestDto) {
    const result = await this.service.suggestTags(dto.title, dto.abstract);
    return { result };
  }
}
