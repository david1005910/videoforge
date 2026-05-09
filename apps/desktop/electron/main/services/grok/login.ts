import { acquireBrowser, getProfileDir } from './browser-pool';
import { logger } from '../../logger';
import type { GrokLoginResponse } from '@videoforge/shared';

const GROK_PROFILE = 'grok';
const GROK_URL = 'https://grok.com';

/**
 * P6-05: Opens browser for user to log in manually.
 *
 * The browser stays open with headless:false so user can complete
 * X.com / grok.com login. Cookies persist in userDataDir.
 */
export async function grokLogin(): Promise<GrokLoginResponse> {
  const browser = await acquireBrowser(GROK_PROFILE);
  const pages = await browser.pages();
  const page = pages[0] ?? (await browser.newPage());

  await page.goto(GROK_URL, { waitUntil: 'networkidle2', timeout: 30_000 });
  logger.info('grok.login: browser opened for user login');

  // Try to detect if already logged in
  let username: string | undefined;
  try {
    const avatar = await page.$('[data-testid="user-avatar"], [aria-label*="profile" i]');
    if (avatar) {
      username =
        (await page.evaluate(
          (el) => el?.getAttribute('aria-label') ?? el?.textContent ?? undefined,
          avatar,
        )) ?? undefined;
    }
  } catch {
    // Not logged in yet — user will log in manually
  }

  return {
    ok: true,
    profilePath: getProfileDir(GROK_PROFILE),
    username,
  };
}
