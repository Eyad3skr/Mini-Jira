#!/usr/bin/env python3
path = "/home/Eddie/code/Mini-Jira/src/app/App.tsx"

BODY = r"""
        {/* CRT Scanline Effect */}
        <motionlessApp user={user} setUser={setUser} currentView={currentView} setCurrentView={setCurrentView} />
"""

# Correct body without typo
BODY = """
        {/* CRT Scanline Effect */}
        <div className="pointer-events-none fixed inset-0 z-50 opacity-10">
          <div className="h-full w-full bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#00ff88_2px,#00ff88_4px)]" />
        </div>

        {/* Header */}
        <header className="border-b-2 border-primary px-6 py-4 flex items-center justify-between bg-background z-10">
          <div className="flex items-center gap-4">
            <motionlessApp user={user} setUser={setUser} currentView={currentView} setCurrentView={setCurrentView} />
          </div>
        </header>
"""

print("Script has typo, fixing manually in next version")
