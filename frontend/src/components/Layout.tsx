import { useState } from 'react';
import {
  Activity,
  Layers,
  Radio,
  RotateCcw,
  Globe,
  RadioTower,
  PanelLeftClose,
  PanelLeft,
  Satellite,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useConnection } from '../hooks/useConnection';
import { useImages } from '../hooks/useImages';
import { useRevolutionStatus } from '../hooks/useRevolutions';

export type NavTabId =
  | 'mission-control'
  | 'transmission'
  | 'ml-gallery'
  | 'metrics'
  | 'retransmit'
  | 'revolutions'
  | 'diagnostics'
  | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: NavTabId;
  onTabChange?: (tabId: NavTabId) => void;
  onNavigateTab?: (tabId: NavTabId) => void;
}

export function Layout({ children, activeTab, onTabChange, onNavigateTab }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { connected, mode, statusText } = useConnection();
  const isMock = mode === 'mock';
  const isReplay = mode === 'replay';
  const { images: transmittingImages } = useImages({ status: 'transmitting', limit: 1 });
  const isStreaming = transmittingImages.length > 0;
  const { status: revStatus } = useRevolutionStatus();
  const inContact = revStatus?.active ?? false;

  const handleNavigate = (id: NavTabId) => {
    if (onTabChange) onTabChange(id);
    if (onNavigateTab) onNavigateTab(id);
  };

  const navItems: { id: NavTabId; label: string; icon: typeof Activity }[] = [
    { id: 'mission-control', label: 'Mission Control', icon: Activity },
    { id: 'transmission', label: 'Live Downlink', icon: Radio },
    { id: 'ml-gallery', label: 'AI Gallery', icon: Layers },
    { id: 'metrics', label: 'Signal Analytics', icon: RadioTower },
    { id: 'retransmit', label: 'Retransmission', icon: RotateCcw },
    { id: 'revolutions', label: 'Orbit Windows', icon: Globe },
    { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-[#040711] text-slate-100 overflow-hidden select-none">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-56'
        } bg-[#070D1A] border-r border-[#131E35] flex flex-col justify-between transition-all duration-200 ease-in-out shrink-0 z-30`}
      >
        {/* Top Branding */}
        <div>
          <div className="flex items-center justify-between p-3 border-b border-[#131E35]">
            {!collapsed && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#0D1830] border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <Satellite className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white tracking-wider leading-none">
                    NEURONEX
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5 tracking-normal">
                    Ground Station OS
                  </div>
                </div>
              </div>
            )}

            {collapsed && (
              <div className="w-8 h-8 rounded bg-[#0D1830] border border-cyan-500/40 flex items-center justify-center mx-auto">
                <Satellite className="w-4 h-4 text-cyan-400" />
              </div>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#0E1B38] transition-colors ${
                collapsed ? 'hidden' : 'block'
              }`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs transition-colors relative ${
                    isActive
                      ? 'bg-[#0E1B38] text-cyan-300 font-semibold border-l-2 border-cyan-400'
                      : 'text-slate-300 hover:text-white hover:bg-[#0B1428] font-medium'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-cyan-400' : 'text-slate-400'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {item.id === 'transmission' && isStreaming && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 animate-pulse ${
                        collapsed ? 'absolute top-1.5 right-1.5' : 'ml-auto'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Status Panel */}
        <div className="p-2.5 border-t border-[#131E35] space-y-2 bg-[#050810]">
          {/* Active Pass Indicator */}
          {!collapsed && (
            <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-[#080E1E] border border-[#131E35]">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    inContact ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                <span className="text-[11px] text-slate-300 font-medium">
                  {inContact ? 'Contact Pass' : 'Standby'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                {revStatus?.revolution ? `Rev #${revStatus.revolution.revolution_num}` : 'Rev —'}
              </span>
            </div>
          )}

          {/* Connection Mode Pill */}
          <div
            className={`flex items-center ${
              collapsed ? 'justify-center p-1.5' : 'justify-between px-2 py-1.5'
            } rounded text-xs bg-[#080E1E] border border-[#131E35]`}
          >
            <div className="flex items-center gap-1.5">
              {isMock ? (
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              ) : isReplay ? (
                <Wifi className="w-3.5 h-3.5 text-amber-400" />
              ) : connected ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              )}

              {!collapsed && (
                <span className="text-[11px] text-slate-300 font-medium">
                  {statusText}
                </span>
              )}
            </div>

            {!collapsed && (
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase tracking-wider ${
                  isMock
                    ? 'bg-[#0D1830] text-cyan-300 border border-cyan-500/30'
                    : isReplay
                    ? 'bg-[#2D1A06] text-amber-300 border border-amber-500/30'
                    : connected
                    ? 'bg-[#062D24] text-emerald-300 border border-emerald-500/30'
                    : 'bg-[#2D0A14] text-rose-300 border border-rose-500/30'
                }`}
              >
                {mode}
              </span>
            )}
          </div>

          {/* Collapse toggle button on bottom when collapsed */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center justify-center p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#0E1B38] transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto bg-[#040711] p-4 lg:p-5 relative min-w-0">
        {children}
      </main>
    </div>
  );
}
