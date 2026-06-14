import type { LucideIcon } from 'lucide-react';

export function AssetBadge({
  label,
  icon: Icon,
  hasAsset,
  count,
}: {
  label: string;
  icon: LucideIcon;
  hasAsset: boolean;
  count?: number;
}) {
  return (
    <div
      className={`gooey-badge flex flex-1 items-center gap-2 px-3 py-2 ${
        hasAsset ? 'bg-[#9B5BFF]/8 border-[#9B5BFF]/15' : 'bg-[#9B5BFF]/8 border-[#9B5BFF]/10'
      }`}
    >
      <Icon size={14} className={hasAsset ? 'text-[#00F0FF]' : 'text-[#9B5BFF]/20'} />
      <span className="text-xs text-[#9B5BFF]/55">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto font-mono text-xs text-[#9B5BFF]/40">{count}</span>
      )}
      {hasAsset && count === undefined && (
        <span className="ml-auto text-xs text-[#00F0FF]">&#10003;</span>
      )}
    </div>
  );
}
