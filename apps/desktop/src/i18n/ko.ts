export const ko = {
  // App
  'app.name': 'VideoForge',

  // Project list
  'projects.title': '프로젝트',
  'projects.empty': '프로젝트가 없습니다',
  'projects.empty.description': '새 프로젝트를 만들어 시작하세요.',
  'projects.newProject': '새 프로젝트',
  'projects.search': '프로젝트 검색...',
  'projects.scenes': '씬',
  'projects.delete': '삭제',
  'projects.delete.confirm': '이 프로젝트를 삭제하시겠습니까?',
  'projects.delete.description': '삭제된 프로젝트는 휴지통으로 이동합니다.',
  'projects.open': '열기',

  // New project wizard
  'wizard.title': '새 프로젝트',
  'wizard.projectTitle': '프로젝트 제목',
  'wizard.projectTitle.placeholder': '제목을 입력하세요',
  'wizard.language': '언어',
  'wizard.resolution': '해상도',
  'wizard.create': '만들기',
  'wizard.cancel': '취소',

  // Editor
  'editor.untitled': '제목 없음',

  // TTS
  'tts.title': 'TTS 합성',
  'tts.voice': '보이스',
  'tts.speed': '속도',
  'tts.text': '텍스트',
  'tts.text.placeholder': '합성할 텍스트를 입력하세요...',
  'tts.generating': '합성 중...',
  'tts.generate': '합성하기',
  'tts.duration': '길이',
  'tts.cached': '캐시됨',
  'tts.stop': '정지',
  'tts.play': '재생',
  'tts.save': '저장',

  // Scene
  'scene.scenes': '씬',
  'scene.add': '씬 추가',
  'scene.empty': '씬이 없습니다.',
  'scene.addFirst': '+ 첫 씬 추가',
  'scene.noScript': '(스크립트 없음)',
  'scene.delete': '삭제',
  'scene.select': '씬을 선택하세요',
  'scene.selectOrAdd': '씬을 선택하거나 추가하세요',
  'scene.manageHint': '좌측 패널에서 씬을 관리할 수 있습니다',
  'scene.header': '씬',
  'scene.narration': '나레이션',
  'scene.charCount': '자',

  // Script editor
  'script.koLabel': '스크립트 (한국어)',
  'script.originalLabel': '스크립트 (원문)',
  'script.koFromOriginal': '스크립트 (원문/번역)',
  'script.originalFromKo': '스크립트 (한국어)',
  'script.placeholder': '나레이션 스크립트를 입력하세요...',
  'script.secondaryPlaceholder': '번역 또는 원문...',
  'script.notes': '노트',
  'script.notesPlaceholder': '연출 메모, 참고사항...',

  // Inspector
  'inspector.title': '인스펙터',
  'inspector.assets': '에셋',
  'inspector.images': '이미지',
  'inspector.videoClips': '영상 클립',
  'inspector.narration': '나레이션',
  'inspector.subtitleAss': '자막 (ASS)',
  'inspector.finalClip': '최종 클립',
  'inspector.prompts': '프롬프트',
  'inspector.notes': '노트',

  // Subtitle
  'subtitle.noAudio': '나레이션 오디오가 없습니다. 먼저 TTS를 생성하세요.',
  'subtitle.emptyScript': '스크립트가 비어있습니다.',
  'subtitle.defaultStyle': '기본 스타일',
  'subtitle.hbasStyle': 'HBAS 스타일',
  'subtitle.generating': '생성 중...',
  'subtitle.generate': '자막 생성',
  'subtitle.word': '단어',
  'subtitle.startMs': '시작 (ms)',
  'subtitle.endMs': '끝 (ms)',

  // Assets
  'assets.title': '에셋 라이브러리',
  'assets.all': '전체',
  'assets.fonts': '폰트',
  'assets.sfx': '효과음',
  'assets.uploadFont': '+ 폰트 업로드',
  'assets.uploadSfx': '+ 효과음 업로드',
  'assets.fontsCount': '개 폰트',
  'assets.itemsCount': '개 항목',
  'assets.loadingFonts': '폰트 로딩 중…',
  'assets.loadingSfx': '효과음 로딩 중…',
  'assets.noSfx': '효과음이 없습니다. 오디오 파일을 업로드하세요.',
  'assets.search': '검색…',
  'assets.delete': '삭제',

  // Common
  'common.cancel': '취소',
  'common.confirm': '확인',
  'common.save': '저장',
  'common.loading': '로딩 중...',
  'common.error': '오류가 발생했습니다',
} as const;
