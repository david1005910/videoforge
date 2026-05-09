import { test, expect } from '@playwright/test';
import express from 'express';
import type { Server } from 'node:http';

/**
 * P8-08: E2E test for chat mock — 1 round + clear.
 *
 * Uses a minimal express mock that echoes back the user message.
 */

const MOCK_PORT = 4448;

test.describe('Chat mock', () => {
  let server: Server;

  test.beforeAll(async () => {
    const app = express();
    app.use(express.json());

    // Mock Gemini API endpoint
    app.post('/api/chat', (req, res) => {
      const body = req.body as { messages?: { content: string }[] };
      const lastMsg = body.messages?.at(-1)?.content ?? 'No message';
      res.json({
        reply: `Mock reply to: ${lastMsg}`,
      });
    });

    // Chat UI page
    app.get('/', (_req, res) => {
      res.type('html').send(`<!DOCTYPE html>
<html>
<head><title>Chat Mock</title></head>
<body>
  <div id="messages"></div>
  <textarea id="input" placeholder="Type a message..."></textarea>
  <button id="send">Send</button>
  <button id="clear">Clear</button>
  <script>
    const msgsEl = document.getElementById('messages');
    const inputEl = document.getElementById('input');
    const messages = [];

    document.getElementById('send').addEventListener('click', async () => {
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      messages.push({ role: 'user', content: text });
      renderMessages();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      const data = await res.json();
      messages.push({ role: 'assistant', content: data.reply });
      renderMessages();
    });

    document.getElementById('clear').addEventListener('click', () => {
      messages.length = 0;
      renderMessages();
    });

    function renderMessages() {
      msgsEl.innerHTML = messages.map(m =>
        '<div class="msg ' + m.role + '">' + m.content + '</div>'
      ).join('');
    }
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

  test('chat 1 round: send message and receive reply', async ({ page }) => {
    await page.goto(`http://localhost:${MOCK_PORT}/`);

    const input = page.locator('#input');
    await input.fill('Hello, how are you?');
    await page.locator('#send').click();

    // Wait for assistant reply
    const assistantMsg = page.locator('.msg.assistant');
    await expect(assistantMsg).toBeVisible({ timeout: 5_000 });
    await expect(assistantMsg).toContainText('Mock reply to: Hello, how are you?');

    // Verify user message is shown
    const userMsg = page.locator('.msg.user');
    await expect(userMsg).toContainText('Hello, how are you?');
  });

  test('clear removes all messages', async ({ page }) => {
    await page.goto(`http://localhost:${MOCK_PORT}/`);

    // Send a message first
    await page.locator('#input').fill('Test message');
    await page.locator('#send').click();
    await expect(page.locator('.msg.assistant')).toBeVisible({ timeout: 5_000 });

    // Clear
    await page.locator('#clear').click();

    // Messages should be gone
    await expect(page.locator('.msg')).toHaveCount(0);
  });
});
