import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

/**
 * P4-05: ffmpeg/ffprobe 경로 분기.
 *
 * 개발: ffmpeg-static npm 패키지
 * 프로덕션: app.asar.unpacked 또는 ffmpeg-static
 */
export function getFfmpegPath(): string {
  if (process.env.VF_FFMPEG_PATH) return process.env.VF_FFMPEG_PATH;
  if (ffmpegStatic) return ffmpegStatic;
  throw new Error('ffmpeg binary not found');
}

export function getFfprobePath(): string {
  if (process.env.VF_FFPROBE_PATH) return process.env.VF_FFPROBE_PATH;
  if (ffprobeStatic.path) return ffprobeStatic.path;
  throw new Error('ffprobe binary not found');
}
