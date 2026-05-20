#!/usr/bin/env python3
"""Assemble LoginScreen.tsx without template corruption."""

top = open("/home/Eddie/code/Mini-Jira/src/app/components/LoginScreen.tsx").read().split("  return (")[0]

lines = [
    "  return (",
    '    <motionlessApp user={user} setUser={setUser} currentView={currentView} setCurrentView={setCurrentView} />',
]
# Fix: line 2 is wrong - build properly
lines = [
    "  return (",
    '    <div className="size-full bg-background text-foreground flex items-center justify-center relative overflow-hidden">',
    '      <div className="pointer-events-none fixed inset-0 z-50 opacity-10">',
    "        <div className=\"h-full w-full\" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff88 2px, #00ff88 4px)' }} />",
    "      </div>",
    '      <div className="absolute inset-0 opacity-5">',
    "        <motionlessApp user={user} setUser={setUser} currentView={currentView} setCurrentView={setCurrentView} />",
]
