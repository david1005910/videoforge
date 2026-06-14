import {
  AppSchemas,
  ProjectSchemas,
  UtilitySchemas,
  type PingRequest,
  type PingResponse,
  type VersionResponse,
  type ProjectSaveRequest,
  type ProjectSaveResponse,
  type ProjectListRequest,
  type ProjectListResponse,
  type ProjectDeleteRequest,
  type ProjectDeleteResponse,
  Project,
} from '@videoforge/shared';
import { unwrap } from './api-utils';

export const appApi = {
  async ping(req: PingRequest): Promise<PingResponse> {
    const resp = await window.electronAPI.app.ping(req);
    return AppSchemas.PingResponse.parse(unwrap(resp));
  },
  async getVersion(): Promise<VersionResponse> {
    const resp = await window.electronAPI.app.getVersion();
    return AppSchemas.VersionResponse.parse(unwrap(resp));
  },
};

export const projectApi = {
  async save(req: ProjectSaveRequest): Promise<ProjectSaveResponse> {
    const resp = await window.electronAPI.project.save(req);
    return ProjectSchemas.ProjectSaveResponse.parse(unwrap(resp));
  },
  async load(id: string): Promise<ReturnType<typeof Project.parse>> {
    const resp = await window.electronAPI.project.load({ id });
    return Project.parse(unwrap(resp));
  },
  async list(req?: Partial<ProjectListRequest>): Promise<ProjectListResponse> {
    const resp = await window.electronAPI.project.list(req);
    return ProjectSchemas.ProjectListResponse.parse(unwrap(resp));
  },
  async delete(req: ProjectDeleteRequest): Promise<ProjectDeleteResponse> {
    const resp = await window.electronAPI.project.delete(req);
    return ProjectSchemas.ProjectDeleteResponse.parse(unwrap(resp));
  },
};

export const dialogApi = {
  async selectFolder(title?: string, defaultPath?: string) {
    const resp = await window.electronAPI.dialog.selectFolder({ title, defaultPath });
    return UtilitySchemas.DialogSelectFolderResponse.parse(unwrap(resp));
  },
  async selectFile(
    title?: string,
    defaultPath?: string,
    filters?: { name: string; extensions: string[] }[],
  ) {
    const resp = await window.electronAPI.dialog.selectFile({ title, defaultPath, filters });
    return UtilitySchemas.DialogSelectFileResponse.parse(unwrap(resp));
  },
  async alert(title: string, message: string, level: 'info' | 'warning' | 'error' = 'info') {
    const resp = await window.electronAPI.dialog.alert({ title, message, level });
    unwrap(resp);
  },
  async confirm(title: string, message: string, opts?: { destructive?: boolean }) {
    const resp = await window.electronAPI.dialog.confirm({
      title,
      message,
      destructive: opts?.destructive,
    });
    return UtilitySchemas.DialogConfirmResponse.parse(unwrap(resp));
  },
};

export const fileApi = {
  async readBase64(filePath: string) {
    const resp = await window.electronAPI.file.readBase64({ path: filePath });
    return UtilitySchemas.FileReadBase64Response.parse(unwrap(resp));
  },
  async saveToDisk(base64Data: string, defaultFilename: string) {
    const resp = await window.electronAPI.file.saveToDisk({ base64Data, defaultFilename });
    return UtilitySchemas.FileSaveToDiskResponse.parse(unwrap(resp));
  },
};

export const shellApi = {
  async openExternal(url: string) {
    const resp = await window.electronAPI.shell.openExternal({ url });
    unwrap(resp);
  },
};

export const clipboardApi = {
  async write(text: string) {
    const resp = await window.electronAPI.clipboard.write({ text });
    unwrap(resp);
  },
};

export const windowApi = {
  async openNew(initialRoute?: string) {
    const resp = await window.electronAPI.window.openNew({ initialRoute });
    return UtilitySchemas.WindowCountResponse.parse(unwrap(resp));
  },
  async count() {
    const resp = await window.electronAPI.window.count();
    return UtilitySchemas.WindowCountResponse.parse(unwrap(resp));
  },
};

export const keychainApi = {
  async get(key: string): Promise<string | null> {
    const resp = await window.electronAPI.keychain.get({ key });
    const data = UtilitySchemas.KeychainGetResponse.parse(unwrap(resp));
    return data.value;
  },
  async set(key: string, value: string): Promise<void> {
    const resp = await window.electronAPI.keychain.set({ key, value });
    unwrap(resp);
  },
  async delete(key: string): Promise<void> {
    const resp = await window.electronAPI.keychain.delete({ key });
    unwrap(resp);
  },
};

export const diagnosticsApi = {
  async errorReport(outputDir: string): Promise<{ reportPath: string }> {
    const resp = await window.electronAPI.diagnostics.errorReport({ outputDir });
    return unwrap(resp) as { reportPath: string };
  },
};
