import { registerAs } from '@nestjs/config';

export const geminiConfig = registerAs('gemini', () => ({
  apiKey: process.env.GEMINI_API_KEY || '',
  model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '10000', 10),
  maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '1', 10),
}));
