// Main Layout Component
import React, { useState, useEffect } from 'react';
import { socketService } from '../services/socket';
import { useImagesStats } from '../hooks/useImages';
import { useRevolutionStatus } from '../hooks/useRevolutions';
import { cn } from '../utils/format';
import {
  LayoutDashboard, Satellite, Signal, AlertTriangle,
  ChevronDown, ChevronUp, Wifi, Database, Settings
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [connected, setConnected] = useState(false);
  const { stats } = useImagesStats();
  const { status } = useRevolutionStatus();

  // Socket connection status
  useEffect(() => {
    const unsubConnect = socketService.on('connected', () => setConnected(true));
    const unsubDisconnect = socketService.on('disconnected', () => setConnected(false));
    socketService.connect();
    return () => { unsubConnect(); unsubDisconnect(); };
  }, []);

  const navItems = [
    { id: 'transmission', label: 'Transmission', icon: Satellite, href: '#transmission' },
    { id: 'ml-gallery', label: 'ML Gallery', icon: Database, href: '#ml-gallery' },
    { id: 'metrics', label: 'Signal Metrics', icon: Signal, href: '#metrics' },
    { id: 'queue', label: 'Queue', icon: LayoutDashboard, href: '#queue' },
    { id: 'retransmit', label: 'Retransmissions', icon: AlertTriangle, href: '#retransmit' },
    { id: 'revolutions', label: 'Revolutions', icon: Wifi, href: '#revolutions' },
  ];

  return (
    <div className="min-h-screen bg-space-950 text-white font-mono">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-space-900 border-r border-white/10 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neuronex-500 to-neuronex-700 flex items-center justify-center">
              <Satellite className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-space font-bold text-lg text-white">Neuronex</h1>
                <p className="text-xs text-neuronex-400">Downlink Dashboard</p>
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className={cn('px-4 py-3 border-b border-white/10', sidebarOpen ? '' : 'justify-center')}>
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', connected ? 'bg-signal-excellent' : 'bg-signal-critical')} />
              {sidebarOpen && (
                <span className="text-xs font-medium">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              )}
            </div>
          </div>

          {/* Stats Summary */}
          {sidebarOpen && stats && (
            <div className="px-4 py-3 border-b border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-neuronex-300">
                <span>Total Images</span>
                <span className="text-white font-medium">{stats.total}</span>
              </div>
              <div className="flex justify-between text-neuronex-300">
                <span>Transmitting</span>
                <span className="text-blue-400 font-medium">{stats.transmitting}</span>
              </div>
              <div className="flex justify-between text-neuronex-300">
                <span>Complete</span>
                <span className="text-green-400 font-medium">{stats.complete}</span>
              </div>
              <div className="flex justify-between text-neuronex-300">
                <span>Pending</span>
                <span className="text-yellow-400 font-medium">{stats.pending}</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  'hover:bg-white/5',
                  sidebarOpen ? 'justify-start' : 'justify-center'
                )}
                title={sidebarOpen ? undefined : item.label}
              >
                <item.icon className="w-5 h-5 text-neuronex-400" />
                {sidebarOpen && <span className="text-sm font-medium text-white">{item.label}</span>}
              </a>
            ))}
          </nav>

          {/* Revolution Status */}
          {sidebarOpen && status && (
            <div className="px-4 py-3 border-t border-white/10">
              <div className="text-xs text-neuronex-400 mb-2">REVOLUTION STATUS</div>
              <div className="space-y-1 text-xs">
                {status.active ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-neuronex-300">Revolution</span>
                      <span className="text-white font-medium">#{status.revolution?.revolution_num}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neuronex-300">Time Left</span>
                      <span className="text-yellow-400 font-medium">{status.time_remaining?.toFixed(0)}s</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${((status.revolution?.window_duration_sec || 60) - (status.time_remaining || 0)) / (status.revolution?.window_duration_sec || 60) * 100}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center text-neuronex-500">
                    Next in {status.time_until_next ? `${Math.ceil(status.time_until_next / 60)} min` : '—'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              'absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-10 rounded-r-lg bg-white/5',
              'hover:bg-white/10 transition-colors flex items-center justify-center'
            )}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4 text-neuronex-400" /> : <ChevronRight className="w-4 h-4 text-neuronex-400" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn('transition-all duration-300', sidebarOpen ? 'ml-64' : 'ml-20')}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-space-900/80 backdrop-blur-sm border-b border-white/10 px-6 py-4">
          <div className="max-w-full flex items-center justify-between">
            <h2 className="font-space font-bold text-xl text-white">Dashboard</h2>
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" title="Settings">
                <Settings className="w-5 h-5 text-neuronex-400" />
              </button>
              <div className="flex items-center gap-2 text-xs text-neuronex-400">
                <span>v1.0.0</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}