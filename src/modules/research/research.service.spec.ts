import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ResearchService } from './research.service';

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

describe('ResearchService', () => {
  const storage = {
    generateUploadUrl: jest.fn(),
    generateDownloadUrl: jest.fn(),
    objectExists: jest.fn(),
    deleteObject: jest.fn(),
  };

  const createService = (db: unknown) =>
    new ResearchService(db as never, storage as never);

  beforeEach(() => {
    jest.clearAllMocks();
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
