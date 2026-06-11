import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET ?? 'change-me-in-production',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-in-production-too',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
}));
