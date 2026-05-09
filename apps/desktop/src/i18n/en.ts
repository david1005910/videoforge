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

  // TTS
  'tts.title': 'TTS Synthesis',
  'tts.voice': 'Voice',
  'tts.speed': 'Speed',
  'tts.text': 'Text',
  'tts.text.placeholder': 'Enter text to synthesize...',
  'tts.generating': 'Generating...',
  'tts.generate': 'Generate',
  'tts.duration': 'Duration',
  'tts.cached': 'cached',
  'tts.stop': 'Stop',
  'tts.play': 'Play',
  'tts.save': 'Save',

  // Scene
  'scene.scenes': 'Scenes',
  'scene.add': 'Add scene',
  'scene.empty': 'No scenes.',
  'scene.addFirst': '+ Add first scene',
  'scene.noScript': '(no script)',
  'scene.delete': 'Delete',
  'scene.select': 'Select a scene',
  'scene.selectOrAdd': 'Select or add a scene',
  'scene.manageHint': 'Manage scenes in the left panel',
  'scene.header': 'Scene',
  'scene.narration': 'Narration',
  'scene.charCount': 'chars',

  // Script editor
  'script.koLabel': 'Script (Korean)',
  'script.originalLabel': 'Script (Original)',
  'script.koFromOriginal': 'Script (Translation)',
  'script.originalFromKo': 'Script (Korean)',
  'script.placeholder': 'Enter narration script...',
  'script.secondaryPlaceholder': 'Translation or original...',
  'script.notes': 'Notes',
  'script.notesPlaceholder': 'Direction notes, references...',

  // Inspector
  'inspector.title': 'Inspector',
  'inspector.assets': 'Assets',
  'inspector.images': 'Images',
  'inspector.videoClips': 'Video Clips',
  'inspector.narration': 'Narration',
  'inspector.subtitleAss': 'Subtitle (ASS)',
  'inspector.finalClip': 'Final Clip',
  'inspector.prompts': 'Prompts',
  'inspector.notes': 'Notes',

  // Subtitle
  'subtitle.noAudio': 'No narration audio. Generate TTS first.',
  'subtitle.emptyScript': 'Script is empty.',
  'subtitle.defaultStyle': 'Default Style',
  'subtitle.hbasStyle': 'HBAS Style',
  'subtitle.generating': 'Generating...',
  'subtitle.generate': 'Generate Subtitles',
  'subtitle.word': 'Word',
  'subtitle.startMs': 'Start (ms)',
  'subtitle.endMs': 'End (ms)',

  // Assets
  'assets.title': 'Asset Library',
  'assets.all': 'All',
  'assets.fonts': 'Fonts',
  'assets.sfx': 'SFX',
  'assets.uploadFont': '+ Upload Font',
  'assets.uploadSfx': '+ Upload SFX',
  'assets.fontsCount': 'fonts',
  'assets.itemsCount': 'items',
  'assets.loadingFonts': 'Loading fonts…',
  'assets.loadingSfx': 'Loading SFX…',
  'assets.noSfx': 'No SFX found. Upload audio files to get started.',
  'assets.search': 'Search…',
  'assets.delete': 'Delete',

  // Common
  'common.cancel': 'Cancel',
  'common.confirm': 'OK',
  'common.save': 'Save',
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
};
