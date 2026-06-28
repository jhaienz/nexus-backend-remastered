import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ResearchService } from './research.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';

const makeUpdateQuery = (returningValue?: unknown) => ({
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue(returningValue),
});

const makeInsertQuery = () => ({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
});

const makeResearch = (overrides: Record<string, unknown> = {}) => ({
  id: 'research-1',
  uploaderId: 'owner-1',
  title: 'Research title',
  status: 'pending',
  filePrivacy: 'public',
  fileKey: 'pdfs/research-1/file.pdf',
  uploadComplete: true,
  researchAuthors: [],
  researchCategories: [],
  researchKeywords: [],
  ...overrides,
});

const mockEmailService = {
  sendPaperApproved: jest.fn().mockResolvedValue(undefined),
  sendPaperRejected: jest.fn().mockResolvedValue(undefined),
  sendNewSubmission: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('admin@test.com'),
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
};

describe('ResearchService', () => {
  const storage = {
    generateUploadUrl: jest.fn(),
    generateDownloadUrl: jest.fn(),
    objectExists: jest.fn(),
    deleteObject: jest.fn(),
  };

  const createService = (db: unknown) =>
    new ResearchService(
      db as never,
      storage as never,
      mockEmailService as unknown as EmailService,
      mockConfigService as never,
      mockAuditService as unknown as AuditService,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmailService.sendPaperApproved.mockResolvedValue(undefined);
    mockEmailService.sendPaperRejected.mockResolvedValue(undefined);
    mockEmailService.sendNewSubmission.mockResolvedValue(undefined);
  });

  describe('findById', () => {
    it('hides non-approved research from public users', async () => {
      const db = {
        query: {
          researches: {
            findFirst: jest.fn().mockResolvedValue(makeResearch()),
          },
        },
      };

      await expect(createService(db).findById('research-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows the owner to view non-approved research', async () => {
      const db = {
        query: {
          researches: {
            findFirst: jest.fn().mockResolvedValue(makeResearch()),
          },
        },
      };

      await expect(
        createService(db).findById('research-1', {
          id: 'owner-1',
          email: 'owner@example.com',
          role: 'student',
        }),
      ).resolves.toMatchObject({ id: 'research-1' });
    });
  });

  describe('getUploadUrl', () => {
    it('sanitizes filenames and marks upload incomplete until confirmed', async () => {
      const updateQuery = makeUpdateQuery();
      const db = {
        query: {
          researches: {
            findFirst: jest.fn().mockResolvedValue(makeResearch()),
          },
        },
        update: jest.fn().mockReturnValue(updateQuery),
      };
      storage.generateUploadUrl.mockResolvedValue('https://upload.example');

      await expect(
        createService(db).getUploadUrl(
          'research-1',
          'owner-1',
          '../unsafe file.pdf',
          'application/pdf',
        ),
      ).resolves.toMatchObject({ uploadUrl: 'https://upload.example' });

      expect(updateQuery.set).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: '.._unsafe_file.pdf',
          uploadComplete: false,
        }),
      );
    });
  });

  describe('approve', () => {
    it('rejects approval before a PDF upload is confirmed', async () => {
      const db = {
        query: {
          researches: {
            findFirst: jest
              .fn()
              .mockResolvedValue(
                makeResearch({ uploadComplete: false, fileKey: null }),
              ),
          },
          users: { findFirst: jest.fn().mockResolvedValue(null) },
        },
      };

      await expect(createService(db).approve('research-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('approves research with a confirmed PDF and notifies the uploader', async () => {
      const updateQuery = makeUpdateQuery([
        makeResearch({ status: 'approved', uploadComplete: true }),
      ]);
      const insertQuery = makeInsertQuery();
      const db = {
        query: {
          researches: {
            findFirst: jest
              .fn()
              .mockResolvedValue(makeResearch({ uploadComplete: true })),
          },
          users: { findFirst: jest.fn().mockResolvedValue(null) },
        },
        update: jest.fn().mockReturnValue(updateQuery),
        insert: jest.fn().mockReturnValue(insertQuery),
      };

      await expect(
        createService(db).approve('research-1'),
      ).resolves.toMatchObject({ status: 'approved' });
      expect(insertQuery.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'owner-1',
          researchId: 'research-1',
        }),
      );
    });

    it('sends approval email to uploader', async () => {
      const updateQuery = makeUpdateQuery([
        makeResearch({ status: 'approved', uploadComplete: true }),
      ]);
      const insertQuery = makeInsertQuery();
      const db = {
        query: {
          researches: {
            findFirst: jest
              .fn()
              .mockResolvedValue(makeResearch({ uploadComplete: true })),
          },
          users: {
            findFirst: jest
              .fn()
              .mockResolvedValue({ email: 'r@test.com', firstName: 'Rey' }),
          },
        },
        update: jest.fn().mockReturnValue(updateQuery),
        insert: jest.fn().mockReturnValue(insertQuery),
      };

      await createService(db).approve('research-1');
      expect(mockEmailService.sendPaperApproved).toHaveBeenCalledWith(
        'r@test.com',
        'Rey',
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('reject', () => {
    it('sends rejection email with reason to uploader', async () => {
      const updateQuery = makeUpdateQuery([
        makeResearch({ status: 'rejected' }),
      ]);
      const insertQuery = makeInsertQuery();
      const db = {
        query: {
          users: {
            findFirst: jest
              .fn()
              .mockResolvedValue({ email: 'r@test.com', firstName: 'Rey' }),
          },
        },
        update: jest.fn().mockReturnValue(updateQuery),
        insert: jest.fn().mockReturnValue(insertQuery),
      };

      await createService(db).reject('research-1', 'Insufficient citations');
      expect(mockEmailService.sendPaperRejected).toHaveBeenCalledWith(
        'r@test.com',
        'Rey',
        expect.any(String),
        'Insufficient citations',
      );
    });
  });

  describe('getPdfUrl', () => {
    it('blocks public access to private PDFs', async () => {
      const db = {
        query: {
          researches: {
            findFirst: jest
              .fn()
              .mockResolvedValue(
                makeResearch({ status: 'approved', filePrivacy: 'private' }),
              ),
          },
        },
      };

      await expect(createService(db).getPdfUrl('research-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows admins to access private PDFs', async () => {
      const db = {
        query: {
          researches: {
            findFirst: jest
              .fn()
              .mockResolvedValue(
                makeResearch({ status: 'approved', filePrivacy: 'private' }),
              ),
          },
        },
      };
      storage.generateDownloadUrl.mockResolvedValue('https://download.example');

      await expect(
        createService(db).getPdfUrl('research-1', {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
        }),
      ).resolves.toEqual({ url: 'https://download.example' });
    });
  });

  describe('resubmit', () => {
    it('resets a rejected research back to pending', async () => {
      const research = makeResearch({ status: 'rejected', rejectionReason: 'Too short' });
      const updated = { ...research, status: 'pending', rejectionReason: null };
      const db = {
        query: {
          researches: {
            findFirst: jest.fn().mockResolvedValue(research),
          },
        },
        update: jest.fn().mockReturnValue(makeUpdateQuery([updated])),
      };

      const result = await createService(db).resubmit('research-1', 'owner-1');

      expect(result.status).toBe('pending');
      expect(result.rejectionReason).toBeNull();
    });

    it('throws BadRequestException when research is not rejected', async () => {
      const research = makeResearch({ status: 'pending' });
      const db = {
        query: {
          researches: { findFirst: jest.fn().mockResolvedValue(research) },
        },
        update: jest.fn().mockReturnValue(makeUpdateQuery([research])),
      };

      await expect(
        createService(db).resubmit('research-1', 'owner-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not own the research', async () => {
      // assertOwnership queries with AND uploaderId = userId; DB returns null when
      // uploaderId doesn't match, so the mock must return null to simulate that.
      const db = {
        query: {
          researches: { findFirst: jest.fn().mockResolvedValue(null) },
        },
        update: jest.fn().mockReturnValue(makeUpdateQuery([])),
      };

      await expect(
        createService(db).resubmit('research-1', 'owner-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns all researches when no status filter is given', async () => {
      const rows = [
        makeResearch({ status: 'approved' }),
        makeResearch({ id: 'research-2', status: 'pending' }),
      ];
      const db = {
        query: {
          researches: {
            findMany: jest.fn().mockResolvedValue(rows),
          },
        },
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ total: 2 }]),
        }),
      };

      const result = await createService(db).findAll(1, 20, undefined);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('filters by status when provided', async () => {
      const rows = [makeResearch({ status: 'pending' })];
      const db = {
        query: {
          researches: {
            findMany: jest.fn().mockResolvedValue(rows),
          },
        },
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ total: 1 }]),
        }),
      };

      const result = await createService(db).findAll(1, 20, 'pending');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('pending');
    });
  });

  describe('trackEvent', () => {
    it('does not track analytics for unavailable research', async () => {
      const db = {
        query: { researches: { findFirst: jest.fn().mockResolvedValue(null) } },
      };

      await expect(
        createService(db).trackEvent('research-1', 'view'),
      ).rejects.toThrow(NotFoundException);
    });

    it('tracks analytics for approved completed research', async () => {
      const insertQuery = makeInsertQuery();
      const updateQuery = makeUpdateQuery();
      const db = {
        query: {
          researches: {
            findFirst: jest
              .fn()
              .mockResolvedValue(
                makeResearch({ status: 'approved', uploadComplete: true }),
              ),
          },
        },
        insert: jest.fn().mockReturnValue(insertQuery),
        update: jest.fn().mockReturnValue(updateQuery),
      };

      await expect(
        createService(db).trackEvent('research-1', 'download'),
      ).resolves.toEqual({ message: 'download tracked' });
      expect(insertQuery.values).toHaveBeenCalledWith({
        researchId: 'research-1',
        eventType: 'download',
      });
    });
  });
});
