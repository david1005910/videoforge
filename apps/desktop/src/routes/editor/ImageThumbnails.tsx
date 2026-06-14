import { useState, useEffect, useCallback } from 'react';
import { Image, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { AssetRef } from '@videoforge/shared';

export function ImageThumbnails({ images }: { images: AssetRef[] }) {
  const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    if (images.length === 0) return;
    setLoading(true);
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
        // skip failed images
      }
    }
    setBlobUrls(urls);
    setLoading(false);
  }, [images]);

  useEffect(() => {
    void loadImages();
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadImages]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-1">
        {loading && <p className="col-span-2 text-[10px] text-[#9B5BFF]/30">Loading...</p>}
        {images.map((img) => {
          const url = blobUrls.get(img.path);
          if (!url) return null;
          return (
            <button
              key={img.path}
              type="button"
              onClick={() => setExpanded(img.path)}
              className="overflow-hidden rounded-xl border border-[#9B5BFF]/15 transition hover:border-[#9B5BFF]/25"
            >
              <img src={url} alt="" className="h-16 w-full object-cover" />
            </button>
          );
        })}
      </div>
      {expanded && blobUrls.get(expanded) && (
        <div
          className="gooey-modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setExpanded(null)}
        >
          <button
            type="button"
            onClick={() => setExpanded(null)}
            className="bg-[#9B5BFF]/12 absolute right-4 top-4 rounded-full p-1.5 text-[#9B5BFF]/55 hover:text-white"
          >
            <X size={18} />
          </button>
          <img
            src={blobUrls.get(expanded)}
            alt=""
            className="max-h-[80vh] max-w-[80vw] rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export function GrokImageThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { base64Data, mimeType } = await api.file.readBase64(path);
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mimeType });
        if (!cancelled) setUrl(URL.createObjectURL(blob));
      } catch {
        /* skip */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [path]);
  if (!url) return <Image size={12} className="text-[#9B5BFF]/20" />;
  return <img src={url} alt="" className="h-full w-full object-cover" />;
}
