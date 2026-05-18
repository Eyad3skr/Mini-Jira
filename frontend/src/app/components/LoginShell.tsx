import type { ReactNode } from 'react';

export default function LoginShell({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <div className="size-full bg-background text-foreground flex items-center justify-center relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-50 opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff88 2px, #00ff88 4px)',
          }}
        />
      </div>

      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'linear-gradient(#00ff88 1px, transparent 1px), linear-gradient(90deg, #00ff88 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>
      <div className="relative z-10 w-full max-w-2xl p-8">
        <div className="border-4 border-primary p-8 bg-background/90">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-4 h-4 bg-primary animate-pulse" />
              <h1 className="text-4xl tracking-widest">MINI-JIRA</h1>
              <div className="w-4 h-4 bg-primary animate-pulse" />
            </div>
            <div className="text-sm text-muted-foreground">TASK MANAGEMENT SYSTEM v2.0</div>
            <div className="text-xs text-muted-foreground mt-1">AWS CLOUD COMPUTING 2026</div>
          </div>
          <div className="border-2 border-primary/30 p-4 mb-6 bg-card">
            <div className="text-xs space-y-1 text-muted-foreground">
              <div>└── AUTHENTICATION: AWS COGNITO</div>
              <div>└── DATABASE: DYNAMODB</div>
              <div>└── STORAGE: S3 + LAMBDA</div>
              <div>└── NOTIFICATIONS: SNS + SQS</div>
              <div>
                └── STATUS: <span className="text-primary">ONLINE</span>
              </div>
            </div>
          </div>
          {busy ? (
            <div className="text-center py-12">
              <div className="text-2xl mb-4">AUTHENTICATING...</div>
              <div className="flex justify-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-primary animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            children
          )}
          <div className="mt-6 text-center text-xs text-muted-foreground border-t-2 border-primary/30 pt-4">
            PRODUCTION: AWS COGNITO USER POOL (OIDC)
          </div>
        </div>
        <div className="text-center mt-4 text-xs text-muted-foreground">
          DEADLINE: 22/5/2026 23:59 | Dr. John Zaki | Cloud Computing Project
        </div>
      </div>
    </div>
  );
}
