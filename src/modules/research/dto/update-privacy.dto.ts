import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdatePrivacyDto {
  @ApiProperty({ enum: ['public', 'private'] })
  @IsString()
  @IsIn(['public', 'private'])
  filePrivacy: 'public' | 'private';
}
