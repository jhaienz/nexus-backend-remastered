import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq, and, gt } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider.js';
import type { DrizzleDB } from '../../database/drizzle.provider.js';
import { users } from '../../database/schema/users.js';
import { passwordResets } from '../../database/schema/password-resets.js';
import { EmailService } from '../email/email.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtPayload } from './strategies/jwt.strategy.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const [user] = await this.db
      .insert(users)
      .values({
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        suffix: dto.suffix,
        institutionId: dto.institutionId,
        programId: dto.programId,
      })
      .returning({ id: users.id, email: users.email });

    const verificationToken = this.jwt.sign(
      { sub: user.id, email: user.email, purpose: 'email-verification' },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: '24h',
      },
    );

    await this.email.sendVerificationEmail(user.email, verificationToken);

    return { message: 'Registration successful. Check your email to verify.' };
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });

      if (payload.purpose !== 'email-verification') {
        throw new BadRequestException('Invalid token');
      }

      await this.db
        .update(users)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(users.id, payload.sub));

      return { message: 'Email verified successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async login(dto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'unverified') {
      throw new UnauthorizedException('Please verify your email first');
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedException('Account suspended');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload: JwtPayload = this.jwt.verify(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });

      const accessToken = this.jwt.sign(
        { sub: payload.sub, email: payload.email, role: payload.role },
        {
          secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
          expiresIn: '15m',
        },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(email: string) {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Don't reveal whether the email exists
      return { message: 'If the email exists, a reset code has been sent.' };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.db.insert(passwordResets).values({
      userId: user.id,
      code,
      expiresAt,
    });

    await this.email.sendPasswordResetCode(email, code);

    return { message: 'If the email exists, a reset code has been sent.' };
  }

  async verifyResetCode(email: string, code: string) {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) throw new BadRequestException('Invalid code');

    const [reset] = await this.db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.userId, user.id),
          eq(passwordResets.code, code),
          gt(passwordResets.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!reset) throw new BadRequestException('Invalid or expired code');

    const resetToken = this.jwt.sign(
      { sub: user.id, purpose: 'password-reset' },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: '10m',
      },
    );

    // Clean up used code
    await this.db.delete(passwordResets).where(eq(passwordResets.id, reset.id));

    return { resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });

      if (payload.purpose !== 'password-reset') {
        throw new BadRequestException('Invalid token');
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await this.db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, payload.sub));

      return { message: 'Password reset successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }
}
