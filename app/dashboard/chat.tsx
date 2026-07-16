'use client';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AUTH_ERROR, chatTransport } from '@/lib/ai/chat-transport';
import { cn } from '@/lib/utils';

const Chat = () => {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error } = useChat({ transport: chatTransport });

  const isBusy = status === 'submitted' || status === 'streaming';

  const send = () => {
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput('');
  };

  return (
    <div className="flex h-[60vh] flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Noch keine Nachrichten. Stell dem Modell unten eine Frage.
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div key={message.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap',
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                )}
              >
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      // eslint-disable-next-line react/no-array-index-key
                      return <span key={`${message.id}-${i}`}>{part.text}</span>;
                    default:
                      return null;
                  }
                })}
              </div>
            </div>
          );
        })}

        {status === 'submitted' && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
              denkt nach…
            </div>
          </div>
        )}

        {error &&
          (error.message.includes(AUTH_ERROR) ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              Deine Sitzung ist abgelaufen.{' '}
              <a href="/login" className="font-medium underline">
                Bitte neu einloggen
              </a>
              .
            </div>
          ) : (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              Etwas ist schiefgelaufen. Läuft Ollama? ({error.message})
            </div>
          ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t p-3"
      >
        <Input
          value={input}
          placeholder="Nachricht schreiben…"
          onChange={(e) => setInput(e.currentTarget.value)}
          disabled={isBusy}
        />
        <Button type="submit" disabled={isBusy || input.trim().length === 0}>
          Senden
        </Button>
      </form>
    </div>
  );
};

export default Chat;
