import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import { logger } from '../../logger';

interface ExtensionTarget {
  name: string;
  url: string;
  windowTitle: string;
  extensionLabel: string;
}

const TARGETS: Record<string, ExtensionTarget> = {
  grok: {
    name: 'Grok',
    url: 'https://grok.com/imagine',
    windowTitle: 'Grok',
    extensionLabel: 'Grok Automation',
  },
  meta: {
    name: 'Meta',
    url: 'https://www.meta.ai/',
    windowTitle: 'Meta',
    extensionLabel: 'Meta Automation',
  },
};

function buildScript(target: ExtensionTarget): string {
  return `
-- Phase 1: Open target URL in Chrome
tell application "Google Chrome"
  activate
  if (count of windows) = 0 then
    make new window
  end if
  set URL of active tab of front window to "${target.url}"
end tell

-- Wait for page to fully load and Chrome UI to stabilize
delay 5

-- Phase 2: Find and click extension button
tell application "System Events"
  tell process "Google Chrome"
    set frontmost to true
    delay 1

    repeat 4 times
      -- Find Chrome window with target title
      set targetWindow to missing value
      repeat with w in (every window)
        if name of w contains "${target.windowTitle}" then
          set targetWindow to w
          exit repeat
        end if
      end repeat
      if targetWindow is missing value then
        repeat with w in (every window)
          if (count of groups of w) > 0 then
            set targetWindow to w
            exit repeat
          end if
        end repeat
      end if

      if targetWindow is not missing value then
        -- Try Path A: side panel open (g1 > g2 > g1 > g1 > toolbar 1 > group 2)
        set extGroup to missing value
        try
          set extGroup to group 2 of toolbar 1 of group 1 of group 1 of group 2 of group 1 of targetWindow
        end try

        -- Try Path B: side panel closed (g1 > g1 > g1 > g1 > toolbar 1 > group 2)
        if extGroup is missing value then
          try
            set extGroup to group 2 of toolbar 1 of group 1 of group 1 of group 1 of group 1 of targetWindow
          end try
        end if

        if extGroup is not missing value then
          set n to count of (every pop up button of extGroup)
          repeat with i from 1 to n
            try
              set btnDesc to description of pop up button i of extGroup
              if btnDesc contains "${target.extensionLabel}" then
                click pop up button i of extGroup
                return "clicked"
              end if
            end try
          end repeat
          return "not_found"
        end if
      end if

      delay 2
    end repeat

    return "timeout"
  end tell
end tell
`;
}

/**
 * Open system Chrome with target URL and auto-click the corresponding
 * automation extension toolbar button.
 *
 * @param target - 'grok' or 'meta' (default: 'grok')
 */
export function openWithExtension(target = 'grok'): { ok: boolean; message: string } {
  const chromePath = '/Applications/Google Chrome.app';

  if (!fs.existsSync(chromePath)) {
    return { ok: false, message: 'Google Chrome이 설치되어 있지 않습니다.' };
  }

  const config = TARGETS[target];
  if (!config) {
    return { ok: false, message: `알 수 없는 대상: ${target}` };
  }

  const script = buildScript(config);

  try {
    const child = execFile('osascript', ['-e', script], { timeout: 30000 }, (err, stdout) => {
      if (err) {
        logger.warn({ err, target }, 'openWithExtension: AppleScript failed');
        return;
      }
      const result = stdout.trim();
      if (result === 'clicked') {
        logger.info({ target }, 'openWithExtension: extension side panel opened');
      } else if (result === 'not_found') {
        logger.warn(
          { target },
          'openWithExtension: extension button not found — is it pinned to toolbar?',
        );
      } else if (result === 'timeout') {
        logger.warn({ target }, 'openWithExtension: Chrome UI not ready after retries');
      } else {
        logger.warn({ target, result }, 'openWithExtension: unexpected result');
      }
    });
    child.unref();

    logger.info({ target }, 'openWithExtension: launching AppleScript');
    return {
      ok: true,
      message: `Chrome에서 ${config.name}을 여는 중입니다...`,
    };
  } catch (err) {
    logger.warn(
      { err, target },
      'openWithExtension: execFile failed, falling back to open command',
    );
    try {
      spawn('open', ['-a', 'Google Chrome', config.url], {
        detached: true,
        stdio: 'ignore',
      }).unref();
      return {
        ok: true,
        message: `Chrome에서 ${config.name}을 열었습니다. 확장 아이콘을 직접 클릭해주세요.`,
      };
    } catch (fallbackErr) {
      logger.error({ err: fallbackErr, target }, 'openWithExtension.fallback.failed');
      return {
        ok: false,
        message: `Chrome 실행 실패: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
      };
    }
  }
}
