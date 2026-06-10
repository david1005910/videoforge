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
    windowTitle: 'grok.com',
    extensionLabel: 'Grok Automation',
  },
  meta: {
    name: 'Meta',
    url: 'https://www.meta.ai/',
    windowTitle: 'meta.ai',
    extensionLabel: 'Meta Automation',
  },
};

/**
 * Click extension button in front window's toolbar.
 * Shared AppleScript snippet used by both targets.
 */
const CLICK_EXTENSION_SNIPPET = (label: string): string => `
tell application "System Events"
  tell process "Google Chrome"
    set frontmost to true
    delay 1

    repeat 4 times
      -- Search front window (item 1) for toolbar with extension buttons
      set wList to every window
      repeat with w in wList
        if (count of groups of w) > 0 then
          set extGroup to missing value
          try
            set extGroup to group 2 of toolbar 1 of group 1 of group 1 of group 2 of group 1 of w
          end try
          if extGroup is missing value then
            try
              set extGroup to group 2 of toolbar 1 of group 1 of group 1 of group 1 of group 1 of w
            end try
          end if

          if extGroup is not missing value then
            set n to count of (every pop up button of extGroup)
            repeat with i from 1 to n
              try
                set btnDesc to description of pop up button i of extGroup
                if btnDesc contains "${label}" then
                  click pop up button i of extGroup
                  return "clicked"
                end if
              end try
            end repeat
          end if
          -- Only try the first window with groups (front window)
          exit repeat
        end if
      end repeat

      delay 2
    end repeat

    return "timeout"
  end tell
end tell
`;

function buildScript(target: ExtensionTarget): string {
  // Strategy: Always open the target URL as a tab in an EXISTING window
  // (not a new window). New Chrome windows show groups=0 in System Events
  // and their toolbar is inaccessible. Existing windows have groups=1.
  //
  // For Grok: find existing grok.com tab or add to front window
  // For Meta: always add a new tab to front window
  return `
tell application "Google Chrome"
  activate

  set foundTab to false
  set wCount to count of windows

  -- Search for existing tab with target URL
  repeat with wIdx from 1 to wCount
    set w to window wIdx
    set tCount to count of tabs of w
    repeat with tIdx from 1 to tCount
      if URL of tab tIdx of w contains "${target.windowTitle}" then
        set active tab index of w to tIdx
        set index of w to 1
        set foundTab to true
        exit repeat
      end if
    end repeat
    if foundTab then exit repeat
  end repeat

  if not foundTab then
    -- Open as new tab in front window (NOT a new window)
    if wCount = 0 then
      make new window
    end if
    tell front window to make new tab with properties {URL:"${target.url}"}
    set active tab index of front window to (count of tabs of front window)
  end if
end tell

delay 5

${CLICK_EXTENSION_SNIPPET(target.extensionLabel)}
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
    const child = execFile('osascript', ['-e', script], { timeout: 45000 }, (err, stdout) => {
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
