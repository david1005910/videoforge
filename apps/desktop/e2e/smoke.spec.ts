import { _electron as electron, test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('app smoke', () => {
  test('launches and renders runtime info + responds to ping', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Heading
    await expect(window.locator('h1')).toContainText('VideoForge');

    // Runtime info 영역에 Electron 버전이 보여야 함
    await expect(window.locator('text=Electron')).toBeVisible({ timeout: 10_000 });

    // Ping round-trip
    const input = window.locator('input[placeholder*="메시지"]');
    await input.fill('e2e ping ' + Date.now());
    await window.locator('button:has-text("Send")').click();

    // echo가 화면에 출력되어야
    await expect(window.locator('text=/✓ e2e ping/')).toBeVisible({ timeout: 5_000 });

    await electronApp.close();
  });
});
