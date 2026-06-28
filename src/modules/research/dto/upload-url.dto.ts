import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

export class UploadUrlDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/\.pdf$/i, { message: 'filename must end with .pdf' })
  filename: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['application/pdf'])
  contentType: string;
}
