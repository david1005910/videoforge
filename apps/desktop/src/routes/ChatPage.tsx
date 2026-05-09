import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import type { ChatMessage } from '@videoforge/shared';

type ChatMode = 'cs' | 'dna';

export function ChatPage() {
  const [mode, setMode] = useState<ChatMode>('cs');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      if (mode === 'cs') {
        const res = await api.chat.cs({ messages: updated });
        setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      } else {
        const res = await api.chat.dna({ messages: updated });
        let content = res.reply;
        if (res.script) {
          content += `\n\n**Generated Script: "${res.script.title}"** (${res.script.scenes.length} scenes)`;
        }
        setMessages((prev) => [...prev, { role: 'assistant', content }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setMessages([]);
    if (mode === 'cs') await api.chat.csClear();
    else await api.chat.dnaClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-4 border-b border-zinc-800 px-6 py-3">
        <h1 className="text-lg font-semibold">AI Chat</h1>
        <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
          <button
            className={`rounded-md px-3 py-1 text-sm ${mode === 'cs' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            onClick={() => setMode('cs')}
          >
            Help
          </button>
          <button
            className={`rounded-md px-3 py-1 text-sm ${mode === 'dna' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            onClick={() => setMode('dna')}
          >
            DNA Script
          </button>
        </div>
        <div className="flex-1" />
        <button
          onClick={handleClear}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
        >
          Clear
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-auto p-6">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-600">
            {mode === 'cs'
              ? 'Ask anything about VideoForge…'
              : 'Describe your video concept to generate a script…'}
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm ${
                msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-200'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-400">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 p-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-200 placeholder:text-zinc-600"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="self-end rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
