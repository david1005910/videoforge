import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { safeStorage } from 'electron';

const KEYCHAIN_DIR = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'VideoForge',
  'Keychain',
);

/**
 * Read an API key from the encrypted keychain store.
 */
export async function getApiKey(key: string): Promise<string | null> {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const p = path.join(KEYCHAIN_DIR, `${safe}.enc`);
  if (!(await fs.pathExists(p))) return null;
  if (!safeStorage.isEncryptionAvailable()) return null;
  const encrypted = await fs.readFile(p);
  return safeStorage.decryptString(encrypted);
}
