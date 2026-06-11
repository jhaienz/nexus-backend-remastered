import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/validation.pipe';
import { RegisterDto, type RegisterDtoType } from './dto/register.dto';
import { LoginDto, type LoginDtoType } from './dto/login.dto';
import { ForgotPasswordDto, type ForgotPasswordDtoType } from './dto/forgot-password.dto';
import { ResetPasswordDto, type ResetPasswordDtoType } from './dto/reset-password.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body(new ZodValidationPipe(RegisterDto)) dto: RegisterDtoType) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ZodValidationPipe(LoginDto)) dto: LoginDtoType) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body(new ZodValidationPipe(ForgotPasswordDto)) dto: ForgotPasswordDtoType) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body(new ZodValidationPipe(ResetPasswordDto)) dto: ResetPasswordDtoType) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  async getMe(@CurrentUser('id') userId: number) {
    return this.authService.getMe(userId);
  }
}
