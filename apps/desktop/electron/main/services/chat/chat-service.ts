import { callGemini } from './gemini-client';
import { loadKnowledge } from './knowledge';
import { logger } from '../../logger';
import type {
  ChatCsRequest,
  ChatCsResponse,
  ChatDnaRequest,
  ChatDnaResponse,
  DnaScriptScene,
  ChatThumbnailRequest,
  ChatThumbnailResponse,
} from '@videoforge/shared';

/**
 * P8-03: CS Chat — general help assistant.
 */
export async function csChat(req: ChatCsRequest): Promise<ChatCsResponse> {
  const apiKey = req.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key required');

  const systemPrompt = loadKnowledge('cs');
  const reply = await callGemini(req.messages, systemPrompt, apiKey);

  logger.info({ messageCount: req.messages.length }, 'chat.cs.complete');
  return { reply };
}

/**
 * P8-03: DNA Script Chat — video script generation.
 */
export async function dnaScriptChat(req: ChatDnaRequest): Promise<ChatDnaResponse> {
  const apiKey = req.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key required');

  const systemPrompt = loadKnowledge('dna-script');
  const reply = await callGemini(req.messages, systemPrompt, apiKey);

  // Try to parse structured script from reply
  let script: ChatDnaResponse['script'];
  try {
    const jsonMatch = /```json\s*([\s\S]*?)```/.exec(reply);
    if (jsonMatch?.[1]) {
      const parsed = JSON.parse(jsonMatch[1]) as { title: string; scenes: DnaScriptScene[] };
      if (parsed.title && Array.isArray(parsed.scenes)) {
        script = parsed;
      }
    }
  } catch {
    // Not a structured response — that's fine
  }

  logger.info(
    { messageCount: req.messages.length, hasScript: Boolean(script) },
    'chat.dna.complete',
  );
  return { reply, script };
}

/**
 * P8-03: Thumbnail analysis — clickability prediction.
 */
export async function thumbnailAnalyze(req: ChatThumbnailRequest): Promise<ChatThumbnailResponse> {
  const apiKey = req.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key required');

  const systemPrompt = loadKnowledge('thumbnail');
  const messages = [
    {
      role: 'user' as const,
      content: `Analyze this YouTube thumbnail for the video titled "${req.title}"${req.channelGenre ? ` (channel genre: ${req.channelGenre})` : ''}. Respond with JSON only.`,
      imagePaths: [req.imagePath],
    },
  ];

  const reply = await callGemini(messages, systemPrompt, apiKey);

  // Parse JSON response
  try {
    const jsonMatch = /```json\s*([\s\S]*?)```/.exec(reply) ?? [null, reply];
    const parsed = JSON.parse(jsonMatch[1] ?? reply) as ChatThumbnailResponse;
    logger.info({ score: parsed.score }, 'chat.thumbnail.complete');
    return {
      score: parsed.score ?? 50,
      suggestions: parsed.suggestions ?? [],
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
    };
  } catch {
    logger.warn('chat.thumbnail: failed to parse JSON, returning default');
    return {
      score: 50,
      suggestions: ['Could not analyze — try again with a clearer image'],
      strengths: [],
      weaknesses: [],
    };
  }
}
