import { Test } from '@nestjs/testing';
import { GeminiService } from './gemini.service';
import { ConfigService } from '@nestjs/config';

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: { text: () => '• Point one\n• Point two\n• Point three' },
      }),
    }),
  })),
}));

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GeminiService,
        { provide: ConfigService, useValue: { getOrThrow: jest.fn().mockReturnValue('fake-key') } },
      ],
    }).compile();
    service = module.get(GeminiService);
  });

  it('summarize returns bullet points', async () => {
    const result = await service.summarize('Test Title', 'Test abstract text.');
    expect(result).toContain('•');
  });

  it('suggestRejection returns non-empty string', async () => {
    const result = await service.suggestRejection('Test Title', 'Test abstract.');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
