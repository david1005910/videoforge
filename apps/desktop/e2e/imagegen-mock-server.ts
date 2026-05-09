import express from 'express';
import type { Server } from 'node:http';

/**
 * P7-08: Mock server for Whisk + ImageFX E2E testing.
 *
 * Serves fake HTML pages with matching selectors.
 */

const FAKE_IMAGE_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function whiskPageHtml(): string {
  return `<!DOCTYPE html>
<html>
<head><title>Whisk Mock</title></head>
<body>
  <h1>Whisk (Mock)</h1>
  <div data-testid="subject-upload"><input type="file" accept="image/*" /></div>
  <textarea data-testid="prompt-input" placeholder="Enter your prompt..."></textarea>
  <button data-testid="generate-btn" aria-label="Generate image">Generate</button>
  <div id="result-container" style="display:none;">
    <div data-testid="result-image">
      <img id="result-img" src="" alt="generated" />
    </div>
  </div>
  <script>
    document.querySelector('[data-testid="generate-btn"]').addEventListener('click', () => {
      setTimeout(() => {
        document.getElementById('result-img').src = '/api/image/fake-result.png';
        document.getElementById('result-container').style.display = 'block';
      }, 300);
    });
  </script>
</body>
</html>`;
}

function imagefxPageHtml(): string {
  return `<!DOCTYPE html>
<html>
<head><title>ImageFX Mock</title></head>
<body>
  <h1>ImageFX (Mock)</h1>
  <textarea data-testid="prompt-input" placeholder="Describe your image..."></textarea>
  <button data-testid="generate-btn" aria-label="Generate image">Create</button>
  <div id="result-container" style="display:none;">
    <div data-testid="result-image">
      <img id="result-img" src="" alt="generated" />
    </div>
  </div>
  <script>
    document.querySelector('[data-testid="generate-btn"]').addEventListener('click', () => {
      setTimeout(() => {
        document.getElementById('result-img').src = '/api/image/fake-result.png';
        document.getElementById('result-container').style.display = 'block';
      }, 300);
    });
  </script>
</body>
</html>`;
}

export function createImagegenMockServer(port = 4446): {
  start: () => Promise<Server>;
  stop: () => Promise<void>;
} {
  const app = express();
  let server: Server | null = null;

  app.get('/whisk', (_req, res) => {
    res.type('html').send(whiskPageHtml());
  });

  app.get('/imagefx', (_req, res) => {
    res.type('html').send(imagefxPageHtml());
  });

  app.get('/api/image/fake-result.png', (_req, res) => {
    const buf = Buffer.from(FAKE_IMAGE_1PX, 'base64');
    res.type('image/png').send(buf);
  });

  return {
    start: () =>
      new Promise((resolve, reject) => {
        server = app.listen(port, () => resolve(server!));
        server.on('error', reject);
      }),
    stop: () =>
      new Promise((resolve) => {
        if (server) server.close(() => resolve());
        else resolve();
      }),
  };
}
