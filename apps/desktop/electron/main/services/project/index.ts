import { Channels, ProjectSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { saveProject, loadProject, listProjects, deleteProject } from './storage';

export function registerProjectHandlers(): void {
  registerHandler(Channels.Project.Save, ProjectSchemas.ProjectSaveRequest, saveProject);

  registerHandler(Channels.Project.Load, ProjectSchemas.ProjectLoadRequest, loadProject);

  registerHandler(Channels.Project.List, ProjectSchemas.ProjectListRequest, listProjects);

  registerHandler(Channels.Project.Delete, ProjectSchemas.ProjectDeleteRequest, deleteProject);
}
