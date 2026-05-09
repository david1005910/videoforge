import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../../logger';
import type { ChatMessage } from '@videoforge/shared';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

/**
 * P8-01: Gemini client for chat assistants.
 */
export async function callGemini(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string,
): Promise<string> {
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    const parts: GeminiPart[] = [{ text: msg.content }];

    // Attach images if present
    if (msg.imagePaths) {
      for (const imgPath of msg.imagePaths) {
        try {
          const data = fs.readFileSync(imgPath);
          const ext = path.extname(imgPath).toLowerCase();
          const mimeMap: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
          };
          parts.push({
            inline_data: {
              mime_type: mimeMap[ext] ?? 'image/png',
              data: data.toString('base64'),
            },
          });
        } catch (err) {
          logger.warn({ imgPath, err }, 'chat.image-read-failed');
        }
      }
    }

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts,
    });
  }

  const url = `${GEMINI_API_BASE}/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${text}`);
  }

  const json = (await resp.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const reply = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) throw new Error('Gemini returned empty response');

  return reply;
}
