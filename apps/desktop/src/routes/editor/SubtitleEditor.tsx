import { useState, useEffect } from 'react';
import { Image, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { AssetRef } from '@videoforge/shared';

interface DialogueLine {
  start: string;
  end: string;
  text: string;
  raw: string;
}

function parseAssDialogues(ass: string): { header: string; lines: DialogueLine[] } {
  const allLines = ass.split('\n');
  const headerLines: string[] = [];
  const dialogues: DialogueLine[] = [];

  for (const line of allLines) {
    if (line.startsWith('Dialogue:')) {
      const parts = line.split(',');
      if (parts.length >= 10) {
        dialogues.push({
          start: parts[1]?.trim() ?? '',
          end: parts[2]?.trim() ?? '',
          text: parts.slice(9).join(','),
          raw: line,
        });
      }
    } else {
      headerLines.push(line);
    }
  }

  return { header: headerLines.join('\n'), lines: dialogues };
}

function rebuildAss(header: string, lines: DialogueLine[]): string {
  const events = lines.map((l) => `Dialogue: 0,${l.start},${l.end},Default,,0,0,0,,${l.text}`);
  return header + '\n' + events.join('\n') + '\n';
}

interface Props {
  assContent: string;
  images: AssetRef[];
  imageAssignments: Record<number, string>;
  onSave: (updated: string) => void;
  onAssignImage: (lineIdx: number, imagePath: string | null) => void;
}

export function SubtitleEditor({
  assContent,
  images,
  imageAssignments,
  onSave,
  onAssignImage,
}: Props): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [parsed, setParsed] = useState(() => parseAssDialogues(assContent));
  const [dirty, setDirty] = useState(false);
  const [imgUrls, setImgUrls] = useState<Map<string, string>>(new Map());
  const [pickerLine, setPickerLine] = useState<number | null>(null);

  useEffect(() => {
    setParsed(parseAssDialogues(assContent));
    setDirty(false);
  }, [assContent]);

  useEffect(() => {
    if (images.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const urls = new Map<string, string>();
      for (const img of images) {
        try {
          const { base64Data, mimeType } = await api.file.readBase64(img.path);
          const binary = atob(base64Data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: mimeType });
          urls.set(img.path, URL.createObjectURL(blob));
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setImgUrls(urls);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [images]);

  const updateLine = (idx: number, field: keyof DialogueLine, value: string) => {
    setParsed((p) => ({
      ...p,
      lines: p.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }));
    setDirty(true);
  };

  const deleteLine = (idx: number) => {
    setParsed((p) => ({ ...p, lines: p.lines.filter((_, i) => i !== idx) }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(rebuildAss(parsed.header, parsed.lines));
    setDirty(false);
  };

  return (
    <div className="mt-1 rounded-lg border border-[#9B5BFF]/15 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] text-[#9B5BFF]/55 hover:text-[#f0e8ff]/75"
      >
        <span>자막 · 이미지 편집 ({parsed.lines.length}줄)</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-[#9B5BFF]/15 px-2 pb-2">
          <div className="gooey-scrollbar max-h-[70vh] overflow-y-auto">
            {parsed.lines.map((line, i) => {
              const assignedImg = imageAssignments[i];
              const assignedUrl = assignedImg ? imgUrls.get(assignedImg) : undefined;

              return (
                <div
                  key={i}
                  className="mt-2 rounded-lg border border-[#9B5BFF]/10 bg-white/[0.02] p-2"
                >
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerLine(pickerLine === i ? null : i)}
                      className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-[#9B5BFF]/15 bg-black/30 transition hover:border-[#9B5BFF]/25"
                      title="이미지 할당"
                    >
                      {assignedUrl ? (
                        <img src={assignedUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Image size={14} className="text-[#9B5BFF]/20" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 text-[10px] font-medium text-[#9B5BFF]/30">
                          {i + 1}
                        </span>
                        <input
                          type="text"
                          value={line.start}
                          onChange={(e) => updateLine(i, 'start', e.target.value)}
                          className="gooey-input w-[80px] px-1.5 py-1 text-[11px]"
                          title="시작"
                        />
                        <span className="text-[10px] text-[#9B5BFF]/30">→</span>
                        <input
                          type="text"
                          value={line.end}
                          onChange={(e) => updateLine(i, 'end', e.target.value)}
                          className="gooey-input w-[80px] px-1.5 py-1 text-[11px]"
                          title="끝"
                        />
                        <button
                          type="button"
                          onClick={() => deleteLine(i)}
                          className="ml-auto text-[#9B5BFF]/30 hover:text-[#FF6A3D]"
                          title="삭제"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={line.text}
                        onChange={(e) => updateLine(i, 'text', e.target.value)}
                        className="gooey-input mt-1.5 w-full px-1.5 py-1 text-[12px]"
                      />
                    </div>
                  </div>

                  {pickerLine === i && images.length > 0 && (
                    <div className="mt-1.5 rounded border border-[#9B5BFF]/15 bg-black/20 p-1">
                      <p className="mb-1 text-[8px] text-[#9B5BFF]/35">이미지 선택:</p>
                      <div className="flex flex-wrap gap-1">
                        {assignedImg && (
                          <button
                            type="button"
                            onClick={() => {
                              onAssignImage(i, null);
                              setPickerLine(null);
                            }}
                            className="flex h-14 w-14 items-center justify-center rounded border border-[#9B5BFF]/15 bg-black/30 text-[8px] text-[#9B5BFF]/35 hover:border-red-400/50 hover:text-[#FF6A3D]"
                            title="할당 해제"
                          >
                            <X size={12} />
                          </button>
                        )}
                        {images.map((img) => {
                          const url = imgUrls.get(img.path);
                          if (!url) return null;
                          const isActive = assignedImg === img.path;
                          return (
                            <button
                              key={img.path}
                              type="button"
                              onClick={() => {
                                onAssignImage(i, img.path);
                                setPickerLine(null);
                              }}
                              className={`h-14 w-14 overflow-hidden rounded border transition hover:border-[#9B5BFF]/30 ${
                                isActive ? 'border-purple-400' : 'border-[#9B5BFF]/15'
                              }`}
                            >
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              className="gooey-btn-primary mt-2 w-full px-2 py-1 text-[10px]"
            >
              자막 저장
            </button>
          )}
        </div>
      )}
    </div>
  );
}
