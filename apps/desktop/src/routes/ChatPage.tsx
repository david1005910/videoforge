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
    <div className="gooey-page flex h-full flex-col">
      <header className="gooey-header flex items-center gap-4 px-6 py-3">
        <h1 className="gooey-text-primary text-lg font-semibold">AI Chat</h1>
        <div className="gooey-tab-group flex gap-1">
          <button
            className={`gooey-tab ${mode === 'cs' ? 'gooey-tab-active' : 'gooey-tab-inactive'}`}
            onClick={() => setMode('cs')}
          >
            Help
          </button>
          <button
            className={`gooey-tab ${mode === 'dna' ? 'gooey-tab-active' : 'gooey-tab-inactive'}`}
            onClick={() => setMode('dna')}
          >
            DNA Script
          </button>
        </div>
        <div className="flex-1" />
        <button onClick={handleClear} className="gooey-btn-secondary px-3 py-1.5 text-sm">
          Clear
        </button>
      </header>

      <div ref={scrollRef} className="gooey-scrollbar flex-1 space-y-4 overflow-auto p-6">
        {messages.length === 0 && (
          <p className="gooey-text-muted text-center text-sm">
            {mode === 'cs'
              ? 'Ask anything about VideoForge…'
              : 'Describe your video concept to generate a script…'}
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user' ? 'gooey-btn-primary' : 'gooey-card px-4 py-2.5 text-white/80'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="gooey-card px-4 py-2.5 text-sm text-white/40">Thinking…</div>
          </div>
        )}
      </div>

      <div className="border-white/6 border-t p-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={2}
            className="gooey-input flex-1 resize-none p-3 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="gooey-btn-primary self-end px-4 py-2 text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
