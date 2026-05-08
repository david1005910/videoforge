import { z } from 'zod';
import { FilePath } from './common';

/* ========================================================================
 * File operations
 * ======================================================================== */

/**
 * file:saveToDisk — 임의의 데이터를 사용자 선택 경로에 저장
 */
export const FileSaveToDiskRequest = z.object({
  base64Data: z.string().min(1),
  defaultFilename: z.string().min(1).max(255),
  /** 다이얼로그 필터 */
  filters: z
    .array(
      z.object({
        name: z.string(),
        extensions: z.array(z.string()),
      }),
    )
    .optional(),
});
export type FileSaveToDiskRequest = z.infer<typeof FileSaveToDiskRequest>;

export const FileSaveToDiskResponse = z.object({
  /** 사용자가 취소하면 null */
  savedPath: FilePath.nullable(),
});
export type FileSaveToDiskResponse = z.infer<typeof FileSaveToDiskResponse>;

/**
 * file:readBase64
 */
export const FileReadBase64Request = z.object({
  path: FilePath,
  /** 최대 읽을 바이트 (안전장치) */
  maxBytes: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024)
    .default(10 * 1024 * 1024),
});
export type FileReadBase64Request = z.infer<typeof FileReadBase64Request>;

export const FileReadBase64Response = z.object({
  base64Data: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});
export type FileReadBase64Response = z.infer<typeof FileReadBase64Response>;

/**
 * file:downloadLocal — 임시 파일 또는 src 경로의 파일을 사용자 폴더로 복사
 */
export const FileDownloadLocalRequest = z.object({
  sourcePath: FilePath,
  /** 사용자에게 다이얼로그를 띄울지 */
  prompt: z.boolean().default(true),
  destinationPath: FilePath.optional(),
});
export type FileDownloadLocalRequest = z.infer<typeof FileDownloadLocalRequest>;

export const FileDownloadLocalResponse = z.object({
  destinationPath: FilePath.nullable(),
});
export type FileDownloadLocalResponse = z.infer<typeof FileDownloadLocalResponse>;

/**
 * file:downloadImage — URL의 이미지 다운
 */
export const FileDownloadImageRequest = z.object({
  url: z.string().url(),
  outputPath: FilePath.optional(),
  /** 메타데이터 (EXIF UserComment에 저장) */
  meta: z.record(z.string()).optional(),
});
export type FileDownloadImageRequest = z.infer<typeof FileDownloadImageRequest>;

export const FileDownloadImageResponse = z.object({
  imagePath: FilePath,
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type FileDownloadImageResponse = z.infer<typeof FileDownloadImageResponse>;

/**
 * file:downloadImageToFolder
 */
export const FileDownloadImageToFolderRequest = FileDownloadImageRequest.extend({
  folderPath: FilePath,
});
export type FileDownloadImageToFolderRequest = z.infer<typeof FileDownloadImageToFolderRequest>;

/**
 * file:saveImage — 렌더러의 이미지 데이터를 저장 (Base64)
 */
export const FileSaveImageRequest = z.object({
  base64Data: z.string().min(1),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  outputPath: FilePath.optional(),
});
export type FileSaveImageRequest = z.infer<typeof FileSaveImageRequest>;

export const FileSaveImageResponse = z.object({
  imagePath: FilePath,
});
export type FileSaveImageResponse = z.infer<typeof FileSaveImageResponse>;

/**
 * file:saveImageTemp / file:saveBlobTemp
 */
export const FileSaveTempRequest = z.object({
  base64Data: z.string().min(1),
  mimeType: z.string(),
  /** 사용 후 자동 삭제 시간 (분) */
  ttlMinutes: z.number().int().min(1).max(60 * 24).default(60),
});
export type FileSaveTempRequest = z.infer<typeof FileSaveTempRequest>;

export const FileSaveTempResponse = z.object({
  tempPath: FilePath,
});
export type FileSaveTempResponse = z.infer<typeof FileSaveTempResponse>;

/* ========================================================================
 * Dialog
 * ======================================================================== */

export const DialogSelectFolderRequest = z.object({
  title: z.string().optional(),
  defaultPath: FilePath.optional(),
});
export type DialogSelectFolderRequest = z.infer<typeof DialogSelectFolderRequest>;

export const DialogSelectFolderResponse = z.object({
  folderPath: FilePath.nullable(),
});
export type DialogSelectFolderResponse = z.infer<typeof DialogSelectFolderResponse>;

export const DialogAlertRequest = z.object({
  title: z.string().max(200),
  message: z.string().max(2000),
  level: z.enum(['info', 'warning', 'error']).default('info'),
});
export type DialogAlertRequest = z.infer<typeof DialogAlertRequest>;

export const DialogConfirmRequest = z.object({
  title: z.string().max(200),
  message: z.string().max(2000),
  okText: z.string().max(50).default('확인'),
  cancelText: z.string().max(50).default('취소'),
  destructive: z.boolean().default(false),
});
export type DialogConfirmRequest = z.infer<typeof DialogConfirmRequest>;

export const DialogConfirmResponse = z.object({
  confirmed: z.boolean(),
});
export type DialogConfirmResponse = z.infer<typeof DialogConfirmResponse>;

/* ========================================================================
 * Shell
 * ======================================================================== */

export const ShellOpenExternalRequest = z.object({
  url: z.string().url(),
});
export type ShellOpenExternalRequest = z.infer<typeof ShellOpenExternalRequest>;

/* ========================================================================
 * Clipboard
 * ======================================================================== */

export const ClipboardWriteRequest = z.object({
  text: z.string().max(1_000_000),
});
export type ClipboardWriteRequest = z.infer<typeof ClipboardWriteRequest>;

/* ========================================================================
 * System
 * ======================================================================== */

export const SystemGetHwidResponse = z.object({
  /** macOS IOPlatformUUID 기반 SHA256 (개인정보 보호용 해시) */
  hwid: z.string().length(64),
});
export type SystemGetHwidResponse = z.infer<typeof SystemGetHwidResponse>;

export const SystemGetFfmpegPathResponse = z.object({
  ffmpegPath: FilePath,
  ffprobePath: FilePath,
  /** 동봉된 버전 */
  version: z.string(),
});
export type SystemGetFfmpegPathResponse = z.infer<typeof SystemGetFfmpegPathResponse>;

/* ========================================================================
 * Window
 * ======================================================================== */

export const WindowOpenNewRequest = z.object({
  initialRoute: z.string().optional(),
});
export type WindowOpenNewRequest = z.infer<typeof WindowOpenNewRequest>;

export const WindowCountResponse = z.object({
  count: z.number().int().nonnegative(),
});
export type WindowCountResponse = z.infer<typeof WindowCountResponse>;

/* ========================================================================
 * Page (in-window text find)
 * ======================================================================== */

export const PageFindRequest = z.object({
  text: z.string().min(1).max(500),
  forward: z.boolean().default(true),
});
export type PageFindRequest = z.infer<typeof PageFindRequest>;

export const PageFoundEvent = z.object({
  matches: z.number().int().nonnegative(),
  activeMatchOrdinal: z.number().int().nonnegative(),
});
export type PageFoundEvent = z.infer<typeof PageFoundEvent>;

/* ========================================================================
 * Drag (HTML5 drag start from Electron)
 * ======================================================================== */

export const DragStartRequest = z.object({
  filePath: FilePath,
  /** 64x64 PNG base64 (드래그 고스트 이미지) */
  iconBase64: z.string().optional(),
});
export type DragStartRequest = z.infer<typeof DragStartRequest>;
