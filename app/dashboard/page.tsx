import Chat from '@/app/dashboard/chat';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground">
          Stelle Fragen an das Modell. Läuft lokal über Ollama (qwen2.5:7b).
        </p>
      </div>

      <Chat />
    </div>
  );
}
