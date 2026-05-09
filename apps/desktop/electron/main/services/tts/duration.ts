import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'fs-extra';

const execAsync = promisify(exec);

/**
 * 오디오 파일 duration(ms) 측정.
 *
 * ffprobe가 있으면 정확한 값, 없으면 파일 크기 기반 추정.
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`,
      { timeout: 10_000 },
    );
    const seconds = parseFloat(stdout.trim());
    if (!isNaN(seconds)) {
      return Math.round(seconds * 1000);
    }
  } catch {
    // ffprobe 없으면 fallback
  }

  // fallback: mp3 평균 비트레이트 128kbps 기반 추정
  try {
    const stat = await fs.stat(audioPath);
    const estimatedSeconds = (stat.size * 8) / (128 * 1000);
    return Math.round(estimatedSeconds * 1000);
  } catch {
    return 0;
  }
}
