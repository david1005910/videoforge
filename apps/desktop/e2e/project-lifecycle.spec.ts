import { _electron as electron, test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

const TEST_PROJECTS_DIR = path.join(os.tmpdir(), 'videoforge-e2e-projects', `${Date.now()}`);

test.describe('P1-16: project lifecycle', () => {
  test('새 프로젝트 → 저장 → 닫기 → 다시 열기', async () => {
    await fs.ensureDir(TEST_PROJECTS_DIR);

    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        VIDEOFORGE_PROJECTS_DIR: TEST_PROJECTS_DIR,
      },
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 1. 프로젝트 목록 화면
    await expect(window.locator('h1')).toContainText(/프로젝트|Projects/, {
      timeout: 10_000,
    });

    // 2. "새 프로젝트" 버튼 클릭
    await window.getByRole('button', { name: /새 프로젝트|New Project/ }).click();

    // 3. 위저드 — 제목 입력
    const titleInput = window.locator('#project-title');
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
    await titleInput.fill('E2E Test Project');

    // 4. "만들기" 클릭
    await window.getByRole('button', { name: /만들기|Create/ }).click();

    // 5. 에디터로 이동 — h2에 프로젝트 제목 표시
    await expect(window.locator('h2', { hasText: 'E2E Test Project' })).toBeVisible({
      timeout: 10_000,
    });

    // 6. 뒤로 가기 (프로젝트 목록)
    await window.getByRole('button', { name: /프로젝트|Projects/ }).click();

    // 7. 목록에 방금 만든 프로젝트 확인
    await expect(window.locator('h3', { hasText: 'E2E Test Project' })).toBeVisible({
      timeout: 5_000,
    });

    // 8. 다시 열기
    await window.locator('h3', { hasText: 'E2E Test Project' }).click();
    await expect(window.locator('h2', { hasText: 'E2E Test Project' })).toBeVisible({
      timeout: 5_000,
    });

    await electronApp.close();
    await fs.remove(TEST_PROJECTS_DIR);
  });
});
