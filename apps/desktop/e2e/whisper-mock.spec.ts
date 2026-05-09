import { test, expect } from '@playwright/test';
import express from 'express';
import type { Server } from 'node:http';

/**
 * P12: E2E test for Whisper local mock — model list + transcription flow.
 *
 * Uses a minimal express mock that simulates:
 * 1. Model listing (catalog display)
 * 2. Transcription result (whisper.cpp JSON output format)
 */

const MOCK_PORT = 4449;

const MOCK_MODELS = [
  { id: 'ggml-tiny', label: 'Tiny (75MB)', sizeMB: 75, downloaded: false },
  {
    id: 'ggml-large-v3-turbo-q5_0',
    label: 'Large v3 Turbo Q5 (547MB)',
    sizeMB: 547,
    downloaded: true,
    filePath: '/tmp/models/ggml-large-v3-turbo-q5_0.bin',
  },
];

const MOCK_TRANSCRIPTION = {
  transcription: [
    {
      timestamps: { from: '00:00:00.000', to: '00:00:02.500' },
      text: 'Hello world',
      tokens: [
        { text: 'Hello', timestamps: { from: '00:00:00.000', to: '00:00:01.200' }, p: 0.95 },
        { text: 'world', timestamps: { from: '00:00:01.200', to: '00:00:02.500' }, p: 0.92 },
      ],
    },
    {
      timestamps: { from: '00:00:02.500', to: '00:00:05.000' },
      text: 'This is a test',
      tokens: [
        { text: 'This', timestamps: { from: '00:00:02.500', to: '00:00:03.000' }, p: 0.98 },
        { text: 'is', timestamps: { from: '00:00:03.000', to: '00:00:03.300' }, p: 0.97 },
        { text: 'a', timestamps: { from: '00:00:03.300', to: '00:00:03.500' }, p: 0.99 },
        { text: 'test', timestamps: { from: '00:00:03.500', to: '00:00:05.000' }, p: 0.94 },
      ],
    },
  ],
};

test.describe('Whisper mock', () => {
  let server: Server;

  test.beforeAll(async () => {
    const app = express();
    app.use(express.json());

    // Model list endpoint
    app.get('/api/whisper/models', (_req, res) => {
      res.json({ models: MOCK_MODELS, binaryReady: true });
    });

    // Model download endpoint (simulated)
    app.post('/api/whisper/download', (req, res) => {
      const body = req.body as { modelId?: string };
      res.json({
        modelId: body.modelId,
        filePath: `/tmp/models/${body.modelId}.bin`,
        sizeMB: 547,
      });
    });

    // Transcription endpoint (returns whisper.cpp JSON format)
    app.post('/api/whisper/transcribe', (_req, res) => {
      res.json(MOCK_TRANSCRIPTION);
    });

    // UI page for whisper model management
    app.get('/', (_req, res) => {
      res.type('html').send(`<!DOCTYPE html>
<html>
<head><title>Whisper Mock</title></head>
<body>
  <div id="status" data-testid="binary-status">Binary: Ready</div>
  <div id="models" data-testid="model-list"></div>
  <div id="transcript-section">
    <button id="transcribe-btn" data-testid="transcribe-btn">Transcribe</button>
    <div id="result" data-testid="transcript-result"></div>
  </div>
  <script>
    async function loadModels() {
      const res = await fetch('/api/whisper/models');
      const data = await res.json();
      const el = document.getElementById('models');
      el.innerHTML = data.models.map(m =>
        '<div class="model" data-id="' + m.id + '" data-downloaded="' + m.downloaded + '">' +
        '<span class="label">' + m.label + '</span>' +
        '<span class="size">' + m.sizeMB + 'MB</span>' +
        '<span class="status">' + (m.downloaded ? 'Downloaded' : 'Not installed') + '</span>' +
        (m.downloaded ? '' : '<button class="download-btn" data-model="' + m.id + '">Download</button>') +
        '</div>'
      ).join('');

      document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const modelId = btn.getAttribute('data-model');
          btn.textContent = 'Downloading...';
          await fetch('/api/whisper/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelId })
          });
          btn.textContent = 'Downloaded';
          btn.disabled = true;
        });
      });
    }

    document.getElementById('transcribe-btn').addEventListener('click', async () => {
      const res = await fetch('/api/whisper/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: 'test.wav', language: 'en' })
      });
      const data = await res.json();
      const resultEl = document.getElementById('result');
      const fullText = data.transcription.map(s => s.text).join(' ');
      const wordCount = data.transcription.reduce((n, s) => n + (s.tokens?.length || 0), 0);
      resultEl.innerHTML =
        '<div class="full-text" data-testid="full-text">' + fullText + '</div>' +
        '<div class="word-count" data-testid="word-count">' + wordCount + ' words</div>' +
        '<div class="segments" data-testid="segments">' +
        data.transcription.map(s =>
          '<div class="segment">[' + s.timestamps.from + ' → ' + s.timestamps.to + '] ' + s.text + '</div>'
        ).join('') +
        '</div>';
    });

    loadModels();
  </script>
</body>
</html>`);
    });

    await new Promise<void>((resolve) => {
      server = app.listen(MOCK_PORT, () => resolve());
    });
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  test('displays model list with download status', async ({ page }) => {
    await page.goto(`http://localhost:${MOCK_PORT}/`);

    const modelList = page.locator('[data-testid="model-list"]');
    await expect(modelList).toBeVisible();

    // Check model entries
    const models = page.locator('.model');
    await expect(models).toHaveCount(2);

    // Tiny model is not downloaded
    const tinyModel = page.locator('.model[data-downloaded="false"]');
    await expect(tinyModel).toContainText('Tiny');
    await expect(tinyModel.locator('.status')).toContainText('Not installed');

    // Large model is downloaded
    const largeModel = page.locator('.model[data-downloaded="true"]');
    await expect(largeModel).toContainText('Large v3 Turbo Q5');
    await expect(largeModel.locator('.status')).toContainText('Downloaded');
  });

  test('simulates model download', async ({ page }) => {
    await page.goto(`http://localhost:${MOCK_PORT}/`);

    const downloadBtn = page.locator('.download-btn[data-model="ggml-tiny"]');
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    await expect(downloadBtn).toHaveText('Downloaded', { timeout: 5_000 });
    await expect(downloadBtn).toBeDisabled();
  });

  test('transcribes audio and shows result with segments', async ({ page }) => {
    await page.goto(`http://localhost:${MOCK_PORT}/`);

    await page.locator('[data-testid="transcribe-btn"]').click();

    // Full text
    const fullText = page.locator('[data-testid="full-text"]');
    await expect(fullText).toBeVisible({ timeout: 5_000 });
    await expect(fullText).toContainText('Hello world This is a test');

    // Word count
    const wordCount = page.locator('[data-testid="word-count"]');
    await expect(wordCount).toContainText('6 words');

    // Segments
    const segments = page.locator('.segment');
    await expect(segments).toHaveCount(2);
    await expect(segments.first()).toContainText('Hello world');
    await expect(segments.last()).toContainText('This is a test');
  });

  test('binary status shows ready', async ({ page }) => {
    await page.goto(`http://localhost:${MOCK_PORT}/`);
    const status = page.locator('[data-testid="binary-status"]');
    await expect(status).toContainText('Ready');
  });
});
