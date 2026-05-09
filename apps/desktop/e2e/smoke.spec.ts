import { _electron as electron, test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('app smoke', () => {
  test('launches and shows project list', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 프로젝트 목록 화면이 보여야 함
    await expect(window.locator('h1')).toContainText(/프로젝트|Projects/, {
      timeout: 10_000,
    });

    await electronApp.close();
  });
});
