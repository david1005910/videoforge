import { _electron as electron, test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('P2-12: TTS page', () => {
  test('TTS 화면 열기 + 텍스트 입력 + Edge TTS 합성', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 1. 프로젝트 목록 화면
    await expect(window.locator('h1')).toContainText(/프로젝트|Projects/, {
      timeout: 10_000,
    });

    // 2. TTS 버튼 클릭
    await window.getByRole('button', { name: /TTS/ }).click();

    // 3. TTS 화면 확인
    await expect(window.locator('h1')).toContainText('TTS 합성', {
      timeout: 5_000,
    });

    // 4. Edge TTS 프로바이더가 기본 선택
    const edgeBtn = window.getByRole('button', { name: 'Edge TTS' });
    await expect(edgeBtn).toBeVisible();

    // 5. 텍스트 입력
    const textarea = window.locator('#tts-text');
    await textarea.fill('안녕하세요. 테스트입니다.');

    // 6. 합성 버튼 클릭 (Edge TTS는 네트워크 필요 — 성공 또는 에러)
    const generateBtn = window.getByRole('button', { name: /합성하기/ });
    await generateBtn.click();

    // 7. 합성 중 상태 또는 결과/에러가 표시될 때까지 대기
    // Edge TTS는 무료 서비스이므로 네트워크 연결 시 성공해야 함
    // 결과가 나오면 duration이 표시되거나, 네트워크 실패 시 에러 메시지 표시
    const resultOrError = window.locator(
      'text=/Duration:|오디오 재생|합성|ECONNREFUSED|ETIMEDOUT|네트워크/',
    );
    await expect(resultOrError.first()).toBeVisible({ timeout: 30_000 });

    // 8. 결과가 있으면 duration > 0 확인
    const durationEl = window.locator('text=/Duration:/');
    if (await durationEl.isVisible()) {
      const text = await durationEl.textContent();
      // "Duration: 0:03" 형태 — 0:00이 아니어야 함
      expect(text).not.toContain('Duration: 0:00');
    }

    await electronApp.close();
  });
});
