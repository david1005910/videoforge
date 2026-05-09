import path from 'node:path';
import fs from 'fs-extra';
import { app } from 'electron';
import { logger } from '../../logger';
import type { ChatMessage } from '@videoforge/shared';

/**
 * P8-04: Chat history saving (per project).
 *
 * Stores chat history as JSON files per project + chat mode.
 * Location: ~/Library/Application Support/VideoForge/ChatHistory/<projectId>/<mode>.json
 */

function historyDir(projectId: string): string {
  return path.join(app.getPath('userData'), 'ChatHistory', projectId);
}

function historyPath(projectId: string, mode: string): string {
  return path.join(historyDir(projectId), `${mode}.json`);
}

export async function loadChatHistory(projectId: string, mode: string): Promise<ChatMessage[]> {
  const filePath = historyPath(projectId, mode);
  if (!(await fs.pathExists(filePath))) return [];

  try {
    const data = (await fs.readJSON(filePath)) as unknown;
    if (Array.isArray(data)) return data as ChatMessage[];
    return [];
  } catch (err) {
    logger.warn({ projectId, mode, err }, 'chat.history.load-failed');
    return [];
  }
}

export async function saveChatHistory(
  projectId: string,
  mode: string,
  messages: ChatMessage[],
): Promise<void> {
  const filePath = historyPath(projectId, mode);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJSON(filePath, messages, { spaces: 2 });
  logger.info({ projectId, mode, count: messages.length }, 'chat.history.saved');
}

export async function clearChatHistory(projectId: string, mode: string): Promise<void> {
  const filePath = historyPath(projectId, mode);
  if (await fs.pathExists(filePath)) {
    await fs.remove(filePath);
    logger.info({ projectId, mode }, 'chat.history.cleared');
  }
}
