/**
 * Re-export from @videoforge/shared for backward compatibility.
 * The ASS generator lives in shared so both main and renderer can use it.
 */
export {
  buildAss,
  wordsToLines,
  msToAss,
  DEFAULT_STYLE,
  HBAS_STYLE,
  type AssStyle,
} from '@videoforge/shared';
