import { ConflictException, NotFoundException } from '@nestjs/common';
import { CollectionService } from './collection.service';

const makeInsertQuery = () => ({
  values: jest.fn().mockResolvedValue(undefined),
});

describe('CollectionService', () => {
  const createService = (db: unknown) => new CollectionService(db as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not save unavailable research', async () => {
    const db = {
      query: { researches: { findFirst: jest.fn().mockResolvedValue(null) } },
    };

    await expect(createService(db).add('user-1', 'research-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('saves approved completed research to a collection', async () => {
    const insertQuery = makeInsertQuery();
    const db = {
      query: {
        researches: {
          findFirst: jest.fn().mockResolvedValue({ id: 'research-1' }),
        },
      },
      insert: jest.fn().mockReturnValue(insertQuery),
    };

    await expect(
      createService(db).add('user-1', 'research-1'),
    ).resolves.toEqual({ message: 'Added to collection' });
    expect(insertQuery.values).toHaveBeenCalledWith({
      userId: 'user-1',
      researchId: 'research-1',
    });
  });

  it('preserves duplicate collection errors as conflicts', async () => {
    const duplicateError = { code: '23505' };
    const db = {
      query: {
        researches: {
          findFirst: jest.fn().mockResolvedValue({ id: 'research-1' }),
        },
      },
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockRejectedValue(duplicateError),
      }),
    };

    await expect(createService(db).add('user-1', 'research-1')).rejects.toThrow(
      ConflictException,
    );
  });
});
