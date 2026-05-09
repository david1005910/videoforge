import { acquireBrowser, getProfileDir } from '../grok/browser-pool';
import { logger } from '../../logger';
import type { ImagefxLoginResponse } from '@videoforge/shared';

const IMAGEFX_PROFILE = 'imagefx';
const IMAGEFX_URL = 'https://labs.google/fx/tools/image-fx';

/**
 * P7-04: Opens browser for user to log in to Google for ImageFX.
 */
export async function imagefxLogin(): Promise<ImagefxLoginResponse> {
  const browser = await acquireBrowser(IMAGEFX_PROFILE);
  const pages = await browser.pages();
  const page = pages[0] ?? (await browser.newPage());

  await page.goto(IMAGEFX_URL, { waitUntil: 'networkidle2', timeout: 30_000 });
  logger.info('imagefx.login: browser opened for user login');

  return {
    ok: true,
    profilePath: getProfileDir(IMAGEFX_PROFILE),
  };
}
