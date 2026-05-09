import puppeteer, { type Browser } from 'puppeteer-core';
import { addExtra } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { app } from 'electron';
import { logger } from '../../logger';

const puppeteerExtra = addExtra(puppeteer as unknown as Parameters<typeof addExtra>[0]);
puppeteerExtra.use(StealthPlugin());

interface PoolEntry {
  browser: Browser;
  lastUsed: number;
}

const entries = new Map<string, PoolEntry>();
const IDLE_MS = 5 * 60_000;

/** Find system Chrome installation path */
function findChromePath(): string {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome/Chromium not found. Install Google Chrome to use Grok automation.');
}

/** Get the user data dir for a given profile key */
export function getProfileDir(profileKey: string): string {
  const dir = path.join(app.getPath('userData'), 'PuppeteerProfiles', profileKey);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Get or create a browser instance for the given profile key */
export async function acquireBrowser(profileKey: string): Promise<Browser> {
  const existing = entries.get(profileKey);
  if (existing?.browser.connected) {
    existing.lastUsed = Date.now();
    return existing.browser;
  }

  const userDataDir = getProfileDir(profileKey);
  const executablePath = findChromePath();
  logger.info({ profileKey, userDataDir, executablePath }, 'browser.launching');

  const browser = await (
    puppeteerExtra as unknown as {
      launch: (opts: Record<string, unknown>) => Promise<Browser>;
    }
  ).launch({
    headless: false,
    executablePath,
    userDataDir,
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });

  entries.set(profileKey, { browser, lastUsed: Date.now() });
  browser.on('disconnected', () => {
    entries.delete(profileKey);
    logger.info({ profileKey }, 'browser.disconnected');
  });

  return browser;
}

/** Close browser for the given profile key */
export async function closeBrowser(profileKey: string): Promise<void> {
  const entry = entries.get(profileKey);
  if (entry?.browser.connected) {
    await entry.browser.close();
  }
  entries.delete(profileKey);
}

/** Check if browser is connected for a given profile key */
export function isBrowserConnected(profileKey: string): boolean {
  const entry = entries.get(profileKey);
  return Boolean(entry?.browser.connected);
}

/** Close idle browsers (called on interval) */
export function closeIdleBrowsers(): void {
  const now = Date.now();
  for (const [key, entry] of entries) {
    if (now - entry.lastUsed > IDLE_MS) {
      logger.info({ profileKey: key }, 'browser.idle-close');
      entry.browser.close().catch(() => {
        /* noop */
      });
      entries.delete(key);
    }
  }
}

/** Capture screenshot on failure for diagnostics */
export async function captureFailure(
  page: {
    screenshot: (opts: { path: string; fullPage: boolean }) => Promise<unknown>;
    content: () => Promise<string>;
  },
  label: string,
): Promise<string | undefined> {
  try {
    const dir = path.join(os.homedir(), 'Library/Logs/VideoForge/automation-failures', label);
    fs.mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(dir, `${ts}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {
      /* noop */
    });
    const html = await page.content().catch(() => '');
    fs.writeFileSync(path.join(dir, `${ts}.html`), html);
    return screenshotPath;
  } catch {
    return undefined;
  }
}
