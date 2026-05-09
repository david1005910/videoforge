import { acquireBrowser, getProfileDir } from '../grok/browser-pool';
import { logger } from '../../logger';

const WHISK_PROFILE = 'whisk';
const WHISK_URL = 'https://labs.google/fx/tools/whisk';

/**
 * P7-01: Opens browser for user to log in to Google manually.
 *
 * Uses same BrowserPool as Grok. Cookies persist in separate profile.
 */
export async function whiskLogin(): Promise<{ ok: boolean; profilePath: string }> {
  const browser = await acquireBrowser(WHISK_PROFILE);
  const pages = await browser.pages();
  const page = pages[0] ?? (await browser.newPage());

  await page.goto(WHISK_URL, { waitUntil: 'networkidle2', timeout: 30_000 });
  logger.info('whisk.login: browser opened for user login');

  return {
    ok: true,
    profilePath: getProfileDir(WHISK_PROFILE),
  };
}
