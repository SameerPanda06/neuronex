// Layout — Page wrapper with space-themed styling
import React from 'react';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-space-950 text-white">
      <header className="border-b border-white/10 bg-space-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neuronex-500 flex items-center justify-center">
                <span className="font-space font-bold text-white text-sm">NX</span>
              </div>
              <h1 className="font-space font-bold text-xl text-white">Neuronex</h1>
              <span className="px-2 py-0.5 text-xs rounded-full bg-neuronex-500/20 text-neuronex-400">v1.0.0</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-neuronex-400">Mission Control</span>
              <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">LIVE</span>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}