import { z } from 'zod';
import { Project, ProjectMeta } from '../domain/project';
import { Ulid, IsoDateTime, FilePath } from './common';

/**
 * project:save
 */
export const ProjectSaveRequest = z.object({
  project: Project,
  /** 강제로 새 폴더에 저장 */
  asNewProject: z.boolean().default(false),
});
export type ProjectSaveRequest = z.infer<typeof ProjectSaveRequest>;

export const ProjectSaveResponse = z.object({
  ok: z.literal(true),
  savedAt: IsoDateTime,
  projectFolder: FilePath,
});
export type ProjectSaveResponse = z.infer<typeof ProjectSaveResponse>;

/**
 * project:load
 */
export const ProjectLoadRequest = z.object({
  id: Ulid,
});
export type ProjectLoadRequest = z.infer<typeof ProjectLoadRequest>;

export const ProjectLoadResponse = Project;
export type ProjectLoadResponse = z.infer<typeof ProjectLoadResponse>;

/**
 * project:list
 */
export const ProjectListRequest = z.object({
  query: z.string().optional(),
  sortBy: z.enum(['updatedAt', 'createdAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().min(1).max(500).default(100),
});
export type ProjectListRequest = z.infer<typeof ProjectListRequest>;

export const ProjectListResponse = z.object({
  items: z.array(ProjectMeta),
  totalCount: z.number().int().nonnegative(),
});
export type ProjectListResponse = z.infer<typeof ProjectListResponse>;

/**
 * project:delete
 */
export const ProjectDeleteRequest = z.object({
  id: Ulid,
  /** 휴지통으로 이동 (true) vs 영구 삭제 (false) */
  toTrash: z.boolean().default(true),
});
export type ProjectDeleteRequest = z.infer<typeof ProjectDeleteRequest>;

export const ProjectDeleteResponse = z.object({
  ok: z.literal(true),
});
export type ProjectDeleteResponse = z.infer<typeof ProjectDeleteResponse>;
