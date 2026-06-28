import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly model;

  constructor(config: ConfigService) {
    const genAI = new GoogleGenerativeAI(config.getOrThrow('GEMINI_API_KEY'));
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  private cap(text: string, max = 2000): string {
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  async summarize(title: string, abstract: string): Promise<string> {
    const prompt = `You are an academic research assistant. Summarize the following research paper abstract in 3 concise bullet points (max 20 words each). Be direct and factual.

Title: ${title}
Abstract: ${this.cap(abstract)}

Respond with only the 3 bullet points, starting each with "•".`;

    const result = await this.model.generateContent(prompt);
    return result.response.text().trim();
  }

  async suggestRejection(title: string, abstract: string): Promise<string> {
    const prompt = `You are an academic review committee member. Based on the following research paper title and abstract, write a constructive, professional rejection feedback in 2-3 sentences. Focus on what's missing or could be improved — be specific and helpful, not harsh.

Title: ${title}
Abstract: ${this.cap(abstract)}

Respond with only the rejection feedback text.`;

    const result = await this.model.generateContent(prompt);
    return result.response.text().trim();
  }

  async suggestTags(title: string, abstract: string): Promise<string> {
    const prompt = `You are an academic librarian. Based on the following research paper, suggest:
- 2-3 academic categories (e.g. "Machine Learning", "Network Security", "Web Development")
- 4-6 specific keywords (short noun phrases, e.g. "neural networks", "data privacy")

Title: ${title}
Abstract: ${this.cap(abstract)}

Respond in this exact format:
Categories: Category One, Category Two
Keywords: keyword one, keyword two, keyword three, keyword four`;

    const result = await this.model.generateContent(prompt);
    return result.response.text().trim();
  }
}
