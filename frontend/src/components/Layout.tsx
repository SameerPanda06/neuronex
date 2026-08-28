import React, { useState } from 'react';
import { useConnection } from '../hooks/useConnection';
import { cn } from '../utils/format';
import {
  LayoutDashboard,
  Radio,
  Images,
  BarChart3,
  RotateCcw,
  Globe,
  Settings,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Satellite,
} from 'lucide-react';

export type NavTabId =
  | 'mission-control'
  | 'transmission'
  | 'ml-gallery'
  | 'metrics'
  | 'retransmit'
  | 'revolutions'
  | 'settings'
  | 'diagnostics';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { connected, mode, statusText } = useConnection();
  const isMock = mode === 'mock';

  const mainNavItems: { id: NavTabId; label: string; icon: React.ElementType }[] = [
    { id: 'mission-control', label: 'Mission Control', icon: LayoutDashboard },
    { id: 'transmission', label: 'Live Downlink', icon: Radio },
    { id: 'ml-gallery', label: 'AI Imagery', icon: Images },
    { id: 'metrics', label: 'Signal Analytics', icon: BarChart3 },
    { id: 'retransmit', label: 'Retransmissions', icon: RotateCcw },
    { id: 'revolutions', label: 'Orbit Windows', icon: Globe },
  ];

  const bottomNavItems: { id: NavTabId; label: string; icon: React.ElementType }[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'diagnostics', label: 'Diagnostics', icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-[#040711] text-slate-100 font-sans flex antialiased selection:bg-cyan-500/30 selection:text-white">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-[#070D1C] border-r border-slate-800/80 flex flex-col justify-between transition-all duration-300 shadow-2xl',
          sidebarOpen ? 'w-60' : 'w-[72px]'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="px-4 py-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-teal-600 via-cyan-500 to-blue-600 p-0.5 flex items-center justify-center shadow-md shadow-cyan-950/50">
                <div className="w-full h-full bg-[#070D1C] rounded-[7px] flex items-center justify-center">
                  <Satellite className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="font-space font-black text-base text-white tracking-widest leading-none">
                    NEURONEX
                  </h1>
                  <p className="text-[9px] font-mono tracking-wider font-semibold text-cyan-400/90 uppercase mt-1">
                    Edge AI Downlink
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {mainNavItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-teal-500/15 text-cyan-300 border border-teal-500/30 shadow-sm shadow-teal-950/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent',
                    sidebarOpen ? 'justify-start' : 'justify-center px-0'
                  )}
                  title={sidebarOpen ? undefined : item.label}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Bottom Settings / Diagnostics */}
          <div className="p-3 border-t border-slate-800/80 space-y-1.5">
            {bottomNavItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-teal-500/15 text-cyan-300 border border-teal-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent',
                    sidebarOpen ? 'justify-start' : 'justify-center px-0'
                  )}
                  title={sidebarOpen ? undefined : item.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}

            {/* Connection Status Badge in Sidebar */}
            <div className="pt-2">
              <div
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[10px] font-mono',
                  sidebarOpen ? 'justify-between' : 'justify-center'
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      isMock
                        ? 'bg-cyan-400 shadow-sm shadow-cyan-400/80 animate-pulse'
                        : connected
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse'
                        : 'bg-rose-500'
                    )}
                  />
                  {sidebarOpen && (
                    <span className="font-semibold text-slate-300 uppercase tracking-wider">
                      {statusText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-[#070D1C] border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Main App Content Viewport */}
      <main
        className={cn(
          'flex-1 min-h-screen transition-all duration-300 bg-gradient-to-b from-[#060B18] via-[#040711] to-[#02040A] p-6 lg:p-8',
          sidebarOpen ? 'ml-60' : 'ml-[72px]'
        )}
      >
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
