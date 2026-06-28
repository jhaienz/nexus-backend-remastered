import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailCodeDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;
}
