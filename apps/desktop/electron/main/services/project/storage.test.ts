import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/tmp/videoforge-test',
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));

import { saveProject, loadProject, listProjects, deleteProject, setProjectsDir } from './storage';

const TEST_DIR = path.join(os.tmpdir(), 'videoforge-test-projects', `${Date.now()}`);

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
    formatVersion: '1.0.0' as const,
    title: 'Test Project',
    language: 'ko',
    resolution: { w: 1920, h: 1080, fps: 30 },
    scenes: [],
    assets: {},
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
    ...overrides,
  };
}

describe('ProjectStorage', () => {
  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);
    setProjectsDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it('saves and loads a project', async () => {
    const project = makeProject();
    const result = await saveProject({ project, asNewProject: false });

    expect(result.ok).toBe(true);
    expect(result.projectFolder).toContain(project.id);

    const loaded = await loadProject({ id: project.id });
    expect(loaded.title).toBe('Test Project');
    expect(loaded.id).toBe(project.id);
  });

  it('creates asset subdirectories on save', async () => {
    const project = makeProject();
    await saveProject({ project, asNewProject: false });

    const dir = path.join(TEST_DIR, project.id);
    expect(await fs.pathExists(path.join(dir, 'assets', 'images'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'assets', 'audio'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'assets', 'video'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'assets', 'subs'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'thumbnails'))).toBe(true);
  });

  it('asNewProject generates a new ID', async () => {
    const project = makeProject();
    const result = await saveProject({ project, asNewProject: true });

    // The saved folder should NOT be the original id
    expect(result.projectFolder).not.toContain(project.id);
  });

  it('lists projects sorted by updatedAt desc', async () => {
    const p1 = makeProject({
      id: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
      title: 'Alpha',
      updatedAt: '2026-05-01T00:00:00.000Z',
    });
    const p2 = makeProject({
      id: '01HKQM2X3Y4Z5A6B7C8D9E0F2H',
      title: 'Beta',
      updatedAt: '2026-05-08T00:00:00.000Z',
    });

    await saveProject({ project: p1, asNewProject: false });
    await saveProject({ project: p2, asNewProject: false });

    const result = await listProjects({ sortBy: 'updatedAt', sortOrder: 'desc', limit: 100 });
    expect(result.totalCount).toBe(2);
    expect(result.items[0]?.title).toBe('Beta');
    expect(result.items[1]?.title).toBe('Alpha');
  });

  it('filters projects by query', async () => {
    await saveProject({ project: makeProject({ title: 'HBAS Episode 1' }), asNewProject: false });
    await saveProject({
      project: makeProject({
        id: '01HKQM2X3Y4Z5A6B7C8D9E0F2H',
        title: 'Something Else',
      }),
      asNewProject: false,
    });

    const result = await listProjects({
      query: 'hbas',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      limit: 100,
    });
    expect(result.totalCount).toBe(1);
    expect(result.items[0]?.title).toBe('HBAS Episode 1');
  });

  it('deletes a project to trash', async () => {
    const project = makeProject();
    await saveProject({ project, asNewProject: false });

    await deleteProject({ id: project.id, toTrash: false });

    const dir = path.join(TEST_DIR, project.id);
    expect(await fs.pathExists(dir)).toBe(false);
  });

  it('throws on loading non-existent project', async () => {
    await expect(loadProject({ id: '01NONEXISTENT0000000000000' })).rejects.toThrow(
      '프로젝트를 찾을 수 없습니다',
    );
  });
});
