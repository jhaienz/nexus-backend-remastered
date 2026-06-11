import {
  Injectable, UnauthorizedException, BadRequestException,
  Inject, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { users, passwordResets } from '../../database/schema';
import { eq, and, gt } from 'drizzle-orm';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import type { RegisterDtoType } from './dto/register.dto';
import type { LoginDtoType } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDtoType) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      ...dto,
      middleName: dto.middleName,
      suffix: dto.suffix,
      password: hashedPassword,
    });

    const verificationToken = this.jwtService.sign(
      { sub: user.id },
      { secret: this.configService.get<string>('jwt.secret'), expiresIn: '24h' as any },
    );

    await this.emailService.sendVerificationEmail(user.email, user.firstName, verificationToken);

    return { message: 'Registration successful. Please check your email to verify your account.', userId: user.id };
  }

  async login(dto: LoginDtoType) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.password) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const payload = { sub: user.id, email: user.email, role: await this.getRoleName(user.roleId) };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiry') as any,
    });

    const refreshPayload = { jti: randomBytes(16).toString('hex'), sub: user.id };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiry') as any,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: payload.role,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');

      const accessPayload = { sub: user.id, email: user.email, role: await this.getRoleName(user.roleId) };
      const newAccessToken = this.jwtService.sign(accessPayload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiry') as any,
      });

      const newRefreshPayload = { jti: randomBytes(16).toString('hex'), sub: user.id };
      const newRefreshToken = this.jwtService.sign(newRefreshPayload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiry') as any,
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      await this.usersService.update(payload.sub, { isVerified: true });
      return { message: 'Email verified successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return { message: 'If the email exists, a password reset link has been sent' };

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await this.db.insert(passwordResets).values({
      userId: user.id,
      token,
      expires,
    });

    await this.emailService.sendPasswordResetEmail(user.email, token);
    return { message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const [reset] = await this.db.select().from(passwordResets).where(
      and(eq(passwordResets.token, token), gt(passwordResets.expires, new Date()), eq(passwordResets.used, false)),
    );

    if (!reset) throw new BadRequestException('Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(reset.userId, { password: hashedPassword });
    await this.db.update(passwordResets).set({ used: true }).where(eq(passwordResets.id, reset.id));

    return { message: 'Password reset successfully' };
  }

  async getMe(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    return {
      id: user.id,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      email: user.email,
      role: await this.getRoleName(user.roleId),
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  private async getRoleName(roleId: number): Promise<string> {
    const [role] = await this.db.select().from(schema.roles).where(eq(schema.roles.id, roleId));
    return role?.name ?? 'unknown';
  }
}
