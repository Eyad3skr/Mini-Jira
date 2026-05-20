import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from 'sonner';
import { clearSession, getStoredUser, getToken, isOidcConfigured } from '../lib/auth';
import type { User } from '../lib/types';
import LoginScreen from './components/LoginScreen';
import OnboardingScreen from './components/OnboardingScreen';
import OidcAuthBridge from './OidcAuthBridge';
import OidcLogoutButton from './components/OidcLogoutButton';
import Dashboard from './components/Dashboard';
import RadialNav from './components/RadialNav';
import ProjectsView from './components/ProjectsView';
import TeamsView from './components/TeamsView';
import AnalyticsView from './components/AnalyticsView';
import SystemFooter from './components/SystemFooter';

export type { User, UserRole } from '../lib/types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'projects' | 'teams' | 'analytics'>('dashboard');

  useEffect(() => {
    if (isOidcConfigured()) return;
    const stored = getStoredUser();
    const token = getToken();
    if (stored && token) {
      setUser(stored);
    }
  }, []);

  if (!user) {
    return (
      <>
        {isOidcConfigured() && <OidcAuthBridge onAuthenticated={setUser} />}
        <LoginScreen onLogin={setUser} />
        <Toaster position="top-right" theme="dark" richColors />
      </>
    );
  }

  if (user.needsOnboarding) {
    return (
      <>
        <OnboardingScreen user={user} onComplete={setUser} />
        <Toaster position="top-right" theme="dark" richColors />
      </>
    );
  }

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="size-full bg-background text-foreground flex flex-col overflow-hidden relative">
        <div className="pointer-events-none fixed inset-0 z-50 opacity-10">
          <div className="h-full w-full bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#00ff88_2px,#00ff88_4px)]" />
        </div>

        <header className="border-b-2 border-primary px-6 py-4 flex items-center justify-between bg-background z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary animate-pulse" />
              <h1 className="tracking-wider">MINI-JIRA</h1>
            </div>
            <div className="h-6 w-px bg-primary/50" />
            <div className="text-sm opacity-70">SYS.ONLINE</div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-sm">
              USER: <span className="text-accent">{user.name}</span>
            </div>
            <div className="text-sm">
              TEAM: <span className="text-accent">{user.teamName}</span>
            </div>
            <div className="text-sm">
              ROLE: <span className="text-accent uppercase">{user.role}</span>
            </div>
            {isOidcConfigured() ? (
              <OidcLogoutButton onLoggedOut={handleLogout} />
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-1 border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                LOGOUT
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
          <RadialNav currentView={currentView} onViewChange={setCurrentView} />

          <main className="flex-1 overflow-auto p-6">
            {currentView === 'dashboard' && <Dashboard user={user} />}
            {currentView === 'projects' && <ProjectsView user={user} />}
            {currentView === 'teams' && <TeamsView user={user} />}
            {currentView === 'analytics' && <AnalyticsView user={user} />}
          </main>
        </div>
        <SystemFooter />
      </div>
      <Toaster position="top-right" theme="dark" richColors />
    </DndProvider>
  );
}
