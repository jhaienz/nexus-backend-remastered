import { Body, Controller, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@ApiTags('Auth')
@Controller('auth')
@Throttle({ default: { ttl: 60_000, limit: 10 } })
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email via 6-digit code' })
  verifyEmail(@Body() dto: VerifyEmailCodeDto) {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  @Public()
  @Post('resend-verification-code')
  @ApiOperation({ summary: 'Resend email verification code' })
  resendVerificationCode(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendVerificationCode(dto.email);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email/password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset code' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('verify-reset-code')
  @ApiOperation({ summary: 'Verify 6-digit reset code' })
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto.email, dto.code);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Set new password with reset token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @ApiBearerAuth()
  @Patch('change-password')
  @ApiOperation({ summary: 'Change password for logged-in user' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }
}
