import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { safeStorage } from 'electron';
import { Channels, UtilitySchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { UserFacingError } from '../../ipc-router';
import { logger } from '../../logger';

/**
 * Keychain 서비스 (P2-07).
 *
 * Electron safeStorage 를 이용한 암호화 저장.
 * macOS Keychain에 의해 보호된 마스터 키로 AES 암호화.
 *
 * 저장 위치: ~/Library/Application Support/VideoForge/Keychain/
 */
const KEYCHAIN_DIR = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'VideoForge',
  'Keychain',
);

function keyPath(key: string): string {
  // key에 경로 조작 문자 방지
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(KEYCHAIN_DIR, `${safe}.enc`);
}

async function getKey(key: string): Promise<string | null> {
  const p = keyPath(key);
  if (!(await fs.pathExists(p))) return null;

  if (!safeStorage.isEncryptionAvailable()) {
    throw new UserFacingError('키체인 암호화를 사용할 수 없습니다.');
  }

  const encrypted = await fs.readFile(p);
  return safeStorage.decryptString(encrypted);
}

async function setKey(key: string, value: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new UserFacingError('키체인 암호화를 사용할 수 없습니다.');
  }

  await fs.ensureDir(KEYCHAIN_DIR);
  const encrypted = safeStorage.encryptString(value);
  await fs.writeFile(keyPath(key), encrypted);
  logger.info({ key }, 'keychain.set');
}

async function deleteKey(key: string): Promise<void> {
  const p = keyPath(key);
  if (await fs.pathExists(p)) {
    await fs.remove(p);
    logger.info({ key }, 'keychain.deleted');
  }
}

export function registerKeychainHandlers(): void {
  registerHandler(Channels.Keychain.Get, UtilitySchemas.KeychainGetRequest, async (req) => {
    const value = await getKey(req.key);
    return { value };
  });

  registerHandler(Channels.Keychain.Set, UtilitySchemas.KeychainSetRequest, async (req) => {
    await setKey(req.key, req.value);
    return {};
  });

  registerHandler(Channels.Keychain.Delete, UtilitySchemas.KeychainDeleteRequest, async (req) => {
    await deleteKey(req.key);
    return {};
  });
}
