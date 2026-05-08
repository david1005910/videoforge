import { useEffect, useState } from 'react';
import { api } from './lib/api';

interface VersionInfo {
  app: string;
  electron: string;
  node: string;
  chrome: string;
  arch: string;
}

const EXPECTED_ARCH = 'x64';
const EXPECTED_ELECTRON_MAJOR = 33;

export function App(): JSX.Element {
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [pingMsg, setPingMsg] = useState('안녕, VideoForge!');
  const [echo, setEcho] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    api.app
      .getVersion()
      .then((v) =>
        setVersion({
          app: v.app,
          electron: v.electron,
          node: v.node,
          chrome: v.chrome,
          arch: v.arch,
        }),
      )
      .catch((e: unknown) => setError(String(e)));
  }, []);

  const handlePing = async (): Promise<void> => {
    setError('');
    try {
      const r = await api.app.ping({ message: pingMsg });
      setEcho(`✓ ${r.echo}  (pid=${r.pid}, ${r.receivedAt})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Intel 16GB Monterey 환경 가정 검증
  const archMismatch = version && version.arch !== EXPECTED_ARCH;
  const electronMajor = version
    ? parseInt(version.electron.split('.')[0] ?? '0', 10)
    : 0;
  const electronMismatch = version && electronMajor !== EXPECTED_ELECTRON_MAJOR;

  return (
    <div className="flex h-full flex-col">
      {/* macOS 드래그 가능한 타이틀바 영역 */}
      <div className="titlebar-drag flex h-10 items-center justify-end border-b border-zinc-800 px-4">
        <span className="text-xs text-zinc-500">VideoForge {version?.app ?? ''}</span>
      </div>

      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-2xl space-y-8">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">VideoForge</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Phase 0 — IPC smoke test. 메인 ↔ 렌더러 round-trip 동작 확인.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Target: Intel x64 + 16GB RAM + macOS Monterey notebook
            </p>
          </header>

          {(archMismatch || electronMismatch) && (
            <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-4">
              <h3 className="text-sm font-semibold text-amber-400">
                ⚠ 예상 환경과 다릅니다
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-amber-300">
                {archMismatch && (
                  <li>
                    Arch: <code className="font-mono">{version?.arch}</code> 감지 — 예상은{' '}
                    <code className="font-mono">{EXPECTED_ARCH}</code>. <br />
                    docs/ENVIRONMENT.md 의 §3.1 빌드 매트릭스 검토 권장.
                  </li>
                )}
                {electronMismatch && (
                  <li>
                    Electron: {version?.electron} 감지 — 예상은 33.x. package.json 의 버전 핀
                    확인.
                  </li>
                )}
              </ul>
            </div>
          )}

          {version && (
            <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Runtime
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <dt className="text-zinc-500">Electron</dt>
                <dd className="font-mono">{version.electron}</dd>
                <dt className="text-zinc-500">Node</dt>
                <dd className="font-mono">{version.node}</dd>
                <dt className="text-zinc-500">Chrome</dt>
                <dd className="font-mono">{version.chrome}</dd>
                <dt className="text-zinc-500">Arch</dt>
                <dd className="font-mono">
                  {version.arch}
                  {version.arch === 'x64' && (
                    <span className="ml-2 rounded bg-blue-900/40 px-1.5 py-0.5 text-xs text-blue-300">
                      Intel
                    </span>
                  )}
                  {version.arch === 'arm64' && (
                    <span className="ml-2 rounded bg-purple-900/40 px-1.5 py-0.5 text-xs text-purple-300">
                      Apple Silicon
                    </span>
                  )}
                </dd>
              </dl>
            </section>
          )}

          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              IPC Ping
            </h2>
            <div className="flex gap-2">
              <input
                value={pingMsg}
                onChange={(e) => setPingMsg(e.target.value)}
                className="titlebar-no-drag flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                placeholder="메시지 입력…"
              />
              <button
                type="button"
                onClick={() => void handlePing()}
                className="titlebar-no-drag rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-600"
              >
                Send
              </button>
            </div>

            {echo && (
              <p className="mt-3 break-all rounded-md bg-zinc-950 p-3 font-mono text-xs text-emerald-400">
                {echo}
              </p>
            )}
            {error && (
              <p className="mt-3 break-all rounded-md bg-red-950/50 p-3 font-mono text-xs text-red-400">
                ✗ {error}
              </p>
            )}
          </section>

          <footer className="text-xs text-zinc-600">
            <p>
              다음 단계: Phase 1 — Project Skeleton. <code>docs/tasks.md</code> 참조.
            </p>
            <p className="mt-1">
              환경별 가이드: <code>docs/ENVIRONMENT.md</code>. Claude Code 사용:{' '}
              <code>docs/CLAUDE-USAGE.md</code>.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
