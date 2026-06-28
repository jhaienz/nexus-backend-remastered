import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

// Minimal mock — we only test changePassword here
const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: '$2b$10$placeholder',
  status: 'active',
  role: 'user',
  ...overrides,
});

describe('AuthService.changePassword', () => {
  const jwtService = { sign: jest.fn().mockReturnValue('token') };
  const configService = { get: jest.fn().mockReturnValue('secret'), getOrThrow: jest.fn().mockReturnValue('secret') };
  const emailService = { sendVerificationCode: jest.fn(), sendPasswordResetCode: jest.fn(), sendPdfRequestNotification: jest.fn() };

  const createService = (db: unknown) =>
    new AuthService(db as never, jwtService as never, configService as never, emailService as never);

  beforeEach(() => jest.clearAllMocks());

  it('changes the password when current password is correct', async () => {
    const realHash = await bcrypt.hash('OldPass1!', 10);
    const user = makeUser({ passwordHash: realHash });

    const db = {
      query: { users: { findFirst: jest.fn().mockResolvedValue(user) } },
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([user]),
      }),
    };

    const result = await createService(db).changePassword('user-1', 'OldPass1!', 'NewPass2!');
    expect(result).toEqual({ message: 'Password changed successfully' });
  });

  it('throws BadRequestException when current password is wrong', async () => {
    const realHash = await bcrypt.hash('OldPass1!', 10);
    const user = makeUser({ passwordHash: realHash });

    const db = {
      query: { users: { findFirst: jest.fn().mockResolvedValue(user) } },
      update: jest.fn(),
    };

    await expect(
      createService(db).changePassword('user-1', 'WrongPass!', 'NewPass2!'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when user does not exist', async () => {
    const db = {
      query: { users: { findFirst: jest.fn().mockResolvedValue(null) } },
      update: jest.fn(),
    };

    await expect(
      createService(db).changePassword('user-1', 'any', 'NewPass2!'),
    ).rejects.toThrow(NotFoundException);
  });
});
