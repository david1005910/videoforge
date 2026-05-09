import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { ulid } from 'ulid';
import type { z } from 'zod';
import type { ProjectMeta } from '@videoforge/shared';
import {
  Project,
  type ProjectSaveRequest,
  type ProjectSaveResponse,
  type ProjectLoadRequest,
  type ProjectListRequest,
  type ProjectListResponse,
  type ProjectDeleteRequest,
  type ProjectDeleteResponse,
} from '@videoforge/shared';
import { logger } from '../../logger';
import { UserFacingError } from '../../ipc-router';

/**
 * ADR-003: 프로젝트 기본 경로.
 * ~/Documents/VideoForge/Projects/
 * 사용자 변경은 settings.json 에서 override.
 */
const DEFAULT_PROJECTS_DIR = path.join(os.homedir(), 'Documents', 'VideoForge', 'Projects');

let projectsDir = DEFAULT_PROJECTS_DIR;

export function getProjectsDir(): string {
  return projectsDir;
}

export function setProjectsDir(dir: string): void {
  projectsDir = dir;
}

function projectDir(id: string): string {
  return path.join(projectsDir, id);
}

function projectJsonPath(id: string): string {
  return path.join(projectDir(id), 'project.json');
}

/**
 * 프로젝트 저장.
 * asNewProject=true 시 새 ID 발급 후 별도 폴더 생성.
 */
export async function saveProject(req: ProjectSaveRequest): Promise<ProjectSaveResponse> {
  const project = req.asNewProject
    ? { ...req.project, id: ulid(), createdAt: new Date().toISOString() }
    : req.project;

  const now = new Date().toISOString();
  const toSave = { ...project, updatedAt: now };

  // zod 검증 (메인 측 방어)
  Project.parse(toSave);

  const dir = projectDir(toSave.id);
  await fs.ensureDir(dir);
  await fs.ensureDir(path.join(dir, 'assets', 'images'));
  await fs.ensureDir(path.join(dir, 'assets', 'audio'));
  await fs.ensureDir(path.join(dir, 'assets', 'video'));
  await fs.ensureDir(path.join(dir, 'assets', 'subs'));
  await fs.ensureDir(path.join(dir, 'thumbnails'));

  const jsonPath = projectJsonPath(toSave.id);
  await fs.writeJSON(jsonPath, toSave, { spaces: 2 });

  logger.info({ id: toSave.id, title: toSave.title }, 'project.saved');

  return {
    ok: true as const,
    savedAt: now,
    projectFolder: dir,
  };
}

/**
 * 프로젝트 로드.
 */
export async function loadProject(req: ProjectLoadRequest): Promise<z.infer<typeof Project>> {
  const jsonPath = projectJsonPath(req.id);

  if (!(await fs.pathExists(jsonPath))) {
    throw new UserFacingError(
      `프로젝트를 찾을 수 없습니다: ${req.id}`,
      '프로젝트 폴더가 삭제되었거나 이동되었을 수 있습니다.',
    );
  }

  const raw: unknown = (await fs.readJSON(jsonPath)) as unknown;
  return Project.parse(raw);
}

/**
 * 프로젝트 목록 조회.
 * 각 하위 폴더의 project.json 을 읽어 메타 정보 수집.
 */
export async function listProjects(req: ProjectListRequest): Promise<ProjectListResponse> {
  await fs.ensureDir(projectsDir);

  const entries = await fs.readdir(projectsDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());

  const items: z.infer<typeof ProjectMeta>[] = [];

  for (const dir of dirs) {
    const jsonPath = path.join(projectsDir, dir.name, 'project.json');
    if (!(await fs.pathExists(jsonPath))) continue;

    try {
      const raw: unknown = (await fs.readJSON(jsonPath)) as unknown;
      const project = Project.parse(raw);

      // 폴더 크기 계산 (재귀)
      const sizeBytes = await getDirSize(path.join(projectsDir, dir.name));

      items.push({
        id: project.id,
        title: project.title,
        language: project.language,
        sceneCount: project.scenes.length,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        sizeBytes,
      });
    } catch (err) {
      logger.warn({ dir: dir.name, err }, 'project.list.skip');
    }
  }

  // 정렬
  const { sortBy, sortOrder } = req;
  items.sort((a, b) => {
    let cmp: number;
    if (sortBy === 'title') {
      cmp = a.title.localeCompare(b.title);
    } else {
      cmp = a[sortBy].localeCompare(b[sortBy]);
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  });

  // query 필터
  const filtered = req.query
    ? items.filter((i) => i.title.toLowerCase().includes(req.query!.toLowerCase()))
    : items;

  return {
    items: filtered.slice(0, req.limit ?? 100),
    totalCount: filtered.length,
  };
}

/**
 * 프로젝트 삭제.
 * toTrash=true 시 macOS Trash로 이동 (shell.trashItem 은 렌더러 전용이므로 직접 구현).
 */
export async function deleteProject(req: ProjectDeleteRequest): Promise<ProjectDeleteResponse> {
  const dir = projectDir(req.id);

  if (!(await fs.pathExists(dir))) {
    throw new UserFacingError(`프로젝트를 찾을 수 없습니다: ${req.id}`);
  }

  if (req.toTrash) {
    // macOS Trash 이동: Electron의 shell.trashItem은 렌더러 전용.
    // 메인에서는 fs.rename 으로 ~/.Trash/ 이동.
    const trashDir = path.join(os.homedir(), '.Trash');
    const trashDest = path.join(trashDir, `VideoForge_${req.id}_${Date.now()}`);
    await fs.move(dir, trashDest);
    logger.info({ id: req.id, dest: trashDest }, 'project.trashed');
  } else {
    await fs.remove(dir);
    logger.info({ id: req.id }, 'project.deleted');
  }

  return { ok: true as const };
}

async function getDirSize(dirPath: string): Promise<number> {
  let total = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += await getDirSize(full);
    } else {
      const stat = await fs.stat(full);
      total += stat.size;
    }
  }
  return total;
}
