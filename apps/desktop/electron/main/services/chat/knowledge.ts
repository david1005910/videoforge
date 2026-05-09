import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

/**
 * P8-02: Knowledge file loader.
 *
 * Loads system prompt markdown files from the knowledge directory.
 * In packaged builds, files are in resources/knowledge/.
 * In dev, files are in electron/knowledge/.
 */
function getKnowledgeDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'knowledge')
    : path.join(__dirname, '../../../knowledge');
}

const cache = new Map<string, string>();

export function loadKnowledge(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;

  const filePath = path.join(getKnowledgeDir(), `${name}.md`);
  const content = fs.readFileSync(filePath, 'utf-8');
  cache.set(name, content);
  return content;
}
