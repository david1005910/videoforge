import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Check, Keyboard, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useProjectStore } from '../../stores/project-store';
import { useT } from '../../i18n';
import { SceneList } from './SceneList';
import { ScriptEditor } from './ScriptEditor';
import { Inspector } from './Inspector';
import { Timeline } from './Timeline';
import { ExportDialog } from './ExportDialog';
import { AutoPipelineDialog } from './AutoPipelineDialog';
import { useSceneHandlers } from './useSceneHandlers';
import type { Project } from '@videoforge/shared';

export function EditorPage(): JSX.Element {
  const t = useT();
  const navigate = useNavigate();
  const { projectId } = useParams({ from: '/editor/$projectId' });
  const { currentProject, setCurrentProject, pushProject } = useProjectStore();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showAutoPipeline, setShowAutoPipeline] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const project = await api.project.load(projectId);
        if (!cancelled) {
          setCurrentProject(project);
          const first = project.scenes[0];
          if (first) setSelectedSceneId(first.id);
        }
      } catch (err) {
        console.error('Failed to load project:', err);
        if (!cancelled) void navigate({ to: '/' });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId, setCurrentProject, navigate]);

  const selectedScene = currentProject?.scenes.find((s) => s.id === selectedSceneId) ?? null;

  const saveProject = useCallback(
    (updated: Project) => {
      pushProject(updated);
      setSaveStatus('saving');
      void api.project
        .save({ project: updated, asNewProject: false })
        .then(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 1500);
        })
        .catch((err) => {
          console.error('Auto-save failed:', err);
          setSaveStatus('idle');
        });
    },
    [pushProject],
  );

  const handlers = useSceneHandlers(
    currentProject,
    saveProject,
    selectedSceneId,
    setSelectedSceneId,
    setDeleteConfirmId,
  );

  const handleTitleEdit = useCallback(() => {
    if (!currentProject) return;
    setTitleDraft(currentProject.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  }, [currentProject]);

  const handleTitleSave = useCallback(() => {
    if (!currentProject || !titleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    const updated: Project = {
      ...currentProject,
      title: titleDraft.trim(),
      updatedAt: new Date().toISOString(),
    };
    setEditingTitle(false);
    saveProject(updated);
  }, [currentProject, titleDraft, saveProject]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        handlers.handleUndo();
        return;
      }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        handlers.handleRedo();
        return;
      }
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setDeleteConfirmId(null);
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
      if (!currentProject) return;

      const scenes = currentProject.scenes;
      const currentIdx = scenes.findIndex((s) => s.id === selectedSceneId);

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIdx > 0) setSelectedSceneId(scenes[currentIdx - 1]!.id);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIdx < scenes.length - 1) setSelectedSceneId(scenes[currentIdx + 1]!.id);
      } else if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handlers.handleAddScene();
      } else if (e.key === 'd' && (e.metaKey || e.ctrlKey) && selectedSceneId) {
        e.preventDefault();
        handlers.handleDuplicateScene(selectedSceneId);
      } else if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey) && selectedSceneId) {
        e.preventDefault();
        handlers.handleRequestDelete(selectedSceneId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentProject, selectedSceneId, handlers]);

  const handleBack = () => {
    setCurrentProject(null);
    void navigate({ to: '/' });
  };

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="gooey-text-muted text-sm">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Titlebar */}
      <div className="titlebar-drag gooey-header flex h-10 items-center gap-3 px-4">
        <button
          type="button"
          onClick={handleBack}
          className="titlebar-no-drag gooey-btn-ghost flex items-center gap-1 px-2 py-1 text-xs"
        >
          <ArrowLeft size={14} />
          {t('projects.title')}
        </button>
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave();
              if (e.key === 'Escape') setEditingTitle(false);
            }}
            className="titlebar-no-drag gooey-input w-40 px-1.5 py-0.5 text-xs"
          />
        ) : (
          <button
            type="button"
            onClick={handleTitleEdit}
            className="titlebar-no-drag gooey-btn-ghost rounded-lg px-1 text-xs"
          >
            {currentProject.title}
          </button>
        )}
        {saveStatus !== 'idle' && (
          <span className="flex items-center gap-1 text-[10px] text-[#9B5BFF]/35">
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && (
              <>
                <Check size={10} className="text-[#00F0FF]" /> Saved
              </>
            )}
          </span>
        )}
        <span className="ml-auto text-[10px] text-[#9B5BFF]/30">
          {currentProject.scenes.length} {t('projects.scenes')}
        </span>
        <button
          type="button"
          onClick={() => setShowShortcuts(true)}
          className="titlebar-no-drag gooey-btn-ghost p-1"
          title="Keyboard Shortcuts (⌘/)"
        >
          <Keyboard size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            void api.grok.openWithExtension('grok').then((res) => {
              if (!res.ok) console.error('Grok Automation:', res.message);
            });
          }}
          className="titlebar-no-drag gooey-btn-ghost ml-1 px-2.5 py-1 text-[10px]"
          title="Chrome에서 Grok Automation 확장 열기"
        >
          Grok Auto
        </button>
        <button
          type="button"
          onClick={() => {
            void api.grok.openWithExtension('meta').then((res) => {
              if (!res.ok) console.error('Meta Automation:', res.message);
            });
          }}
          className="titlebar-no-drag gooey-btn-ghost ml-1 px-2.5 py-1 text-[10px]"
          title="Chrome에서 Meta Automation 확장 열기"
        >
          Meta Auto
        </button>
        <button
          type="button"
          onClick={() => setShowAutoPipeline(true)}
          className="titlebar-no-drag gooey-btn-secondary ml-1 px-2.5 py-1 text-[10px]"
        >
          {t('inspector.autoPipeline')}
        </button>
        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="titlebar-no-drag gooey-btn-primary ml-1 px-2.5 py-1 text-[10px]"
        >
          Export
        </button>
      </div>

      {/* 3-panel editor */}
      <main className="flex flex-1 overflow-hidden">
        <SceneList
          scenes={currentProject.scenes}
          selectedId={selectedSceneId}
          onSelect={setSelectedSceneId}
          onAdd={handlers.handleAddScene}
          onDelete={handlers.handleRequestDelete}
          onDuplicate={handlers.handleDuplicateScene}
          onReorder={handlers.handleReorder}
        />
        <ScriptEditor
          scene={selectedScene}
          projectLanguage={currentProject.language}
          onScriptChange={handlers.handleScriptChange}
          onNotesChange={handlers.handleNotesChange}
          onLoadNarration={handlers.handleLoadNarration}
        />
        <Inspector
          scene={selectedScene}
          projectLanguage={currentProject.language}
          onLoadNarration={handlers.handleLoadNarration}
          onDropImages={handlers.handleDropImages}
          onDropClips={handlers.handleDropClips}
          onSubtitleGenerated={handlers.handleSubtitleGenerated}
          onFinalClipGenerated={handlers.handleFinalClipGenerated}
        />
      </main>

      <Timeline
        scenes={currentProject.scenes}
        selectedId={selectedSceneId}
        onSelect={setSelectedSceneId}
        onReorder={handlers.handleReorder}
      />

      {showAutoPipeline && (
        <AutoPipelineDialog
          scenes={currentProject.scenes}
          onClose={() => setShowAutoPipeline(false)}
          onComplete={handlers.handleAutoPipelineComplete}
        />
      )}

      {showExport && (
        <ExportDialog
          projectTitle={currentProject.title}
          scenes={currentProject.scenes}
          onClose={() => setShowExport(false)}
          onScenesUpdated={handlers.handleAutoPipelineComplete}
        />
      )}

      {deleteConfirmId && (
        <div className="gooey-modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
          <div className="gooey-modal w-full max-w-xs p-5">
            <h3 className="text-sm font-semibold text-[#f0e8ff]">{t('projects.delete.confirm')}</h3>
            <p className="mt-1 text-xs text-[#9B5BFF]/45">
              {t('scene.header')} #
              {(currentProject.scenes.find((s) => s.id === deleteConfirmId)?.index ?? 0) + 1}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="gooey-btn-ghost px-3 py-1.5 text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handlers.handleDeleteScene(deleteConfirmId)}
                className="gooey-btn-danger px-3 py-1.5 text-xs"
              >
                {t('scene.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div
          className="gooey-modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowShortcuts(false)}
        >
          <div className="gooey-modal w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f0e8ff]">Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} className="gooey-btn-ghost p-1">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ['⌘ Z', 'Undo'],
                ['⌘ ⇧ Z', 'Redo'],
                ['↑ / ↓', 'Navigate scenes'],
                ['⌘ N', 'Add scene'],
                ['⌘ D', 'Duplicate scene'],
                ['⌘ ⌫', 'Delete scene'],
                ['⌘ /', 'Toggle shortcuts'],
                ['Esc', 'Close overlay'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[#9B5BFF]/55">{desc}</span>
                  <kbd className="bg-[#9B5BFF]/8 rounded-lg border border-[#9B5BFF]/15 px-1.5 py-0.5 font-mono text-[10px] text-[#f0e8ff]/75">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
