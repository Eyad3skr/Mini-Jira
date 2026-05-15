import { LayoutGrid, FolderKanban, Users, BarChart3 } from 'lucide-react';

interface RadialNavProps {
  currentView: 'dashboard' | 'projects' | 'teams' | 'analytics';
  onViewChange: (view: 'dashboard' | 'projects' | 'teams' | 'analytics') => void;
}

export default function RadialNav({ currentView, onViewChange }: RadialNavProps) {
  const navItems = [
    { id: 'dashboard' as const, icon: LayoutGrid, label: 'BOARD', angle: 0 },
    { id: 'projects' as const, icon: FolderKanban, label: 'PROJECTS', angle: 90 },
    { id: 'teams' as const, icon: Users, label: 'TEAMS', angle: 180 },
    { id: 'analytics' as const, icon: BarChart3, label: 'DATA', angle: 270 },
  ];

  return (
    <div className="w-64 border-r-2 border-primary flex flex-col bg-sidebar relative">
      {/* Orbital Navigation */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-48 h-48">
          {/* Center indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-2 border-primary flex items-center justify-center">
              <div className="w-2 h-2 bg-primary animate-pulse" />
            </div>
          </div>

          {/* Orbital ring */}
          <div className="absolute inset-0 border-2 border-primary/30 rounded-full" />

          {/* Nav items */}
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const radian = (item.angle * Math.PI) / 180;
            const radius = 80;
            const x = Math.cos(radian) * radius;
            const y = Math.sin(radian) * radius;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`absolute w-12 h-12 border-2 flex items-center justify-center transition-all ${
                  isActive
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground'
                }`}
                style={{
                  left: `calc(50% + ${x}px - 24px)`,
                  top: `calc(50% + ${y}px - 24px)`,
                }}
                title={item.label}
              >
                <item.icon size={20} />
              </button>
            );
          })}

          {/* Connection lines */}
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            if (!isActive) return null;

            const radian = (item.angle * Math.PI) / 180;
            const startRadius = 32;
            const endRadius = 80;
            const x1 = Math.cos(radian) * startRadius;
            const y1 = Math.sin(radian) * startRadius;
            const x2 = Math.cos(radian) * endRadius;
            const y2 = Math.sin(radian) * endRadius;

            return (
              <svg
                key={`line-${item.id}`}
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
              >
                <line
                  x1={`calc(50% + ${x1}px)`}
                  y1={`calc(50% + ${y1}px)`}
                  x2={`calc(50% + ${x2}px)`}
                  y2={`calc(50% + ${y2}px)`}
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-accent"
                  strokeDasharray="4 4"
                />
              </svg>
            );
          })}
        </div>
      </div>

      {/* Linear fallback labels */}
      <div className="border-t-2 border-primary">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={`linear-${item.id}`}
              onClick={() => onViewChange(item.id)}
              className={`w-full px-4 py-3 border-b border-primary/30 text-left flex items-center gap-3 transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-primary/10'
              }`}
            >
              <item.icon size={16} />
              <span className="text-sm tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
