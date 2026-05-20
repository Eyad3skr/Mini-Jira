import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export default function SystemFooter() {
  const [now, setNow] = useState(() => new Date());
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
        setApiOk(res.ok);
      } catch {
        setApiOk(false);
      }
    };
    void check();
    const poll = setInterval(() => void check(), 30_000);
    return () => clearInterval(poll);
  }, []);

  const date = now.toLocaleDateString('en-CA');
  const time = now.toLocaleTimeString('en-US', { hour12: false });

  const statusLabel =
    apiOk === null ? 'CHECKING API…' : apiOk ? 'API ONLINE' : 'API OFFLINE';
  const statusClass =
    apiOk === null
      ? 'text-muted-foreground'
      : apiOk
        ? 'text-primary'
        : 'text-destructive';

  return (
    <footer className="border-t-2 border-primary px-6 py-2 flex items-center justify-between text-sm bg-background z-10">
      <div className="flex items-center gap-6">
        <div className={`flex items-center gap-2 ${statusClass}`}>
          <div
            className={`w-2 h-2 rounded-full ${
              apiOk ? 'bg-primary animate-pulse' : apiOk === false ? 'bg-destructive' : 'bg-muted-foreground'
            }`}
          />
          <span>{statusLabel}</span>
        </div>
        <div className="text-muted-foreground hidden sm:block">
          EVENTS: SNS · SQS · LAMBDA
        </div>
      </div>
      <div className="font-mono tabular-nums tracking-wide">
        {date} {time}
      </div>
    </footer>
  );
}
