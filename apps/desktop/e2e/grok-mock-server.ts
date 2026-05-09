import express from 'express';
import type { Server } from 'node:http';

/**
 * P6-12: Mock Grok server for E2E testing.
 *
 * Serves fake Grok HTML pages with matching selectors from selectors.ts.
 * Simulates: page load → prompt input → generate → video result.
 */

const FAKE_VIDEO_BASE64 = 'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE='; // Minimal valid-ish mp4 header

const GROK_PAGE_HTML = `<!DOCTYPE html>
<html>
<head><title>Grok Mock</title></head>
<body>
  <h1>Grok Video Generator (Mock)</h1>
  <textarea data-testid="prompt-input" placeholder="Enter your prompt..."></textarea>
  <input data-testid="image-upload" type="file" accept="image/*" />
  <button data-testid="generate-btn" aria-label="Generate video">Generate</button>
  <div id="result-container" style="display:none;">
    <div data-testid="video-result">
      <video id="result-video" src="" controls></video>
    </div>
    <button data-testid="download-btn" aria-label="Download video">Download</button>
  </div>

  <script>
    const btn = document.querySelector('[data-testid="generate-btn"]');
    btn.addEventListener('click', () => {
      // Simulate generation delay, then show result
      setTimeout(() => {
        const video = document.getElementById('result-video');
        video.src = '/api/video/fake-result.mp4';
        document.getElementById('result-container').style.display = 'block';
      }, 500);
    });
  </script>
</body>
</html>`;

export function createGrokMockServer(port = 4444): {
  start: () => Promise<Server>;
  stop: () => Promise<void>;
} {
  const app = express();
  let server: Server | null = null;

  app.get('/', (_req, res) => {
    res.type('html').send(GROK_PAGE_HTML);
  });

  app.get('/api/video/fake-result.mp4', (_req, res) => {
    const buf = Buffer.from(FAKE_VIDEO_BASE64, 'base64');
    res.type('video/mp4').send(buf);
  });

  return {
    start: () =>
      new Promise((resolve, reject) => {
        server = app.listen(port, () => {
          resolve(server!);
        });
        server.on('error', reject);
      }),
    stop: () =>
      new Promise((resolve) => {
        if (server) {
          server.close(() => resolve());
        } else {
          resolve();
        }
      }),
  };
}
