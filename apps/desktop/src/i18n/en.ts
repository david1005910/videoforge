import type { ko } from './ko';

export const en: Record<keyof typeof ko, string> = {
  // App
  'app.name': 'VideoForge',

  // Project list
  'projects.title': 'Projects',
  'projects.empty': 'No projects',
  'projects.empty.description': 'Create a new project to get started.',
  'projects.newProject': 'New Project',
  'projects.search': 'Search projects...',
  'projects.scenes': 'scenes',
  'projects.delete': 'Delete',
  'projects.delete.confirm': 'Delete this project?',
  'projects.delete.description': 'The project will be moved to Trash.',
  'projects.open': 'Open',

  // New project wizard
  'wizard.title': 'New Project',
  'wizard.projectTitle': 'Project Title',
  'wizard.projectTitle.placeholder': 'Enter title',
  'wizard.language': 'Language',
  'wizard.resolution': 'Resolution',
  'wizard.create': 'Create',
  'wizard.cancel': 'Cancel',

  // Editor
  'editor.untitled': 'Untitled',

  // Common
  'common.cancel': 'Cancel',
  'common.confirm': 'OK',
  'common.save': 'Save',
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
};
