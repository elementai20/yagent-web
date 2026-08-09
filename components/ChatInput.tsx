'use client';

import { useState } from 'react';
import { useSpeech } from '@/lib/useSpeech';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  sessionKey: string;
  onSend: (sessionKey: string, text: string) => void;
}

export default function ChatInput({ sessionKey, onSend }: ChatInputProps) {
  const [text, setText] = useState('');
  // Voice: running transcript fills the box live (review-then-send).
  const { recording, busy, error, supported, toggle } = useSpeech((t) => setText(t));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(sessionKey, value);
    setText('');
  }

  return (
    <div className="border-t border-border bg-panel">
      {error && <p className="px-[22px] pt-2 text-xs text-amber">{error}</p>}
      <form className="flex gap-2.5 px-[22px] py-3.5" onSubmit={submit}>
        <button
          type="button"
          disabled={!supported || busy}
          title={supported ? (recording ? 'Stop recording' : 'Speak') : 'Voice not supported in this browser'}
          onClick={toggle}
          className={cn(
            'rounded-md border border-border bg-[var(--bg)] px-3 text-base leading-none',
            'hover:border-accent disabled:cursor-not-allowed disabled:opacity-40',
            recording && 'animate-mic-pulse border-[#e5484d] bg-[rgba(229,72,77,0.15)]',
          )}
        >
          {busy ? '⏳' : '🎤'}
        </button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={recording ? 'Listening…' : `Message ${sessionKey}…`}
          autoComplete="off"
          className="flex-1"
        />
        <Button type="submit" disabled={!text.trim()} className="px-[18px]">
          Send
        </Button>
      </form>
    </div>
  );
}
