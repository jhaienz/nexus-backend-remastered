import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PdfRequestService } from './pdf-request.service';

const makeResearch = (overrides: Record<string, unknown> = {}) => ({
  id: 'research-1',
  title: 'Private research',
  status: 'approved',
  filePrivacy: 'private',
  fileKey: 'pdfs/research-1/file.pdf',
  uploadComplete: true,
  uploader: { email: 'owner@example.com' },
  ...overrides,
});

const makeRequestDto = () => ({
  researchId: 'research-1',
  name: 'Requester',
  email: 'requester@example.com',
  purpose: 'Academic use',
});

const makeInsertQuery = (returningValue: unknown) => ({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue(returningValue),
});

describe('PdfRequestService', () => {
  const storage = { generateDownloadUrl: jest.fn() };
  const email = {
    sendPdfRequestNotification: jest.fn(),
    sendPdfApproval: jest.fn(),
    sendPdfRejection: jest.fn(),
  };

  const createService = (db: unknown) =>
    new PdfRequestService(db as never, storage as never, email as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides non-approved research when creating a request', async () => {
    const db = {
      query: {
        researches: {
          findFirst: jest
            .fn()
            .mockResolvedValue(makeResearch({ status: 'pending' })),
        },
      },
    };

    await expect(createService(db).create(makeRequestDto())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects requests for public PDFs', async () => {
    const db = {
      query: {
        researches: {
          findFirst: jest
            .fn()
            .mockResolvedValue(makeResearch({ filePrivacy: 'public' })),
        },
      },
    };

    await expect(createService(db).create(makeRequestDto())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects requests before a PDF upload is complete', async () => {
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

    await expect(createService(db).create(makeRequestDto())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates a request and notifies the uploader for eligible private PDFs', async () => {
    const request = { id: 'request-1', researchId: 'research-1' };
    const insertQuery = makeInsertQuery([request]);
    const db = {
      query: {
        researches: { findFirst: jest.fn().mockResolvedValue(makeResearch()) },
      },
      insert: jest.fn().mockReturnValue(insertQuery),
    };

    await expect(createService(db).create(makeRequestDto())).resolves.toEqual(
      request,
    );
    expect(email.sendPdfRequestNotification).toHaveBeenCalledWith(
      'owner@example.com',
      'Requester',
      'Private research',
    );
  });
});
