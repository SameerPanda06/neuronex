import React, { Suspense, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ImageViewer } from './components/ImageViewer';
import { socketService } from './services/socket';
import { useImages } from './hooks/useImages';
import { useSchedule } from './hooks/useSchedule';
import { useCommand } from './hooks/useCommand';

// Lazy-loaded tab components
const MissionControl = React.lazy(() => import('./components/MissionControl'));
const LiveDownlink = React.lazy(() => import('./components/LiveDownlink'));
const AiGallery = React.lazy(() => import('./components/AiGallery'));
const SignalAnalytics = React.lazy(() => import('./components/SignalAnalytics'));
const RetransmissionCenter = React.lazy(() => import('./components/RetransmissionCenter'));
const OrbitWindows = React.lazy(() => import('./components/OrbitWindows'));
const Diagnostics = React.lazy(() => import('./components/Diagnostics'));

// Loading screen
function ScreenLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-space-950">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-neuronex-500/30 rounded-full border-t-neuronex-400 animate-spin mx-auto" />
        <p className="font-space text-xl text-white tracking-wider">LOADING MISSION VIEW</p>
        <p className="text-neuronex-400 text-sm">Initializing downlink systems...</p>
      </div>
    </div>
  );
}

type NavTabId =
  | 'mission-control'
  | 'live-downlink'
  | 'ml-gallery'
  | 'metrics'
  | 'retransmit'
  | 'revolutions'
  | 'settings'
  | 'diagnostics';

const TABS: { id: NavTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'mission-control', label: 'Mission Control', icon: '🎛️' },
  { id: 'live-downlink', label: 'Live Downlink', icon: '📡' },
  { id: 'ml-gallery', label: 'AI Gallery', icon: '🖼️' },
  { id: 'metrics', label: 'Signal Analytics', icon: '📊' },
  { id: 'retransmit', label: 'Retransmit Center', icon: '🔄' },
  { id: 'revolutions', label: 'Orbit Windows', icon: '🛰️' },
  { id: 'diagnostics', label: 'Diagnostics', icon: '🔧' },
];

function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('mission-control');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    socketService.connect().catch(console.error);
    return () => socketService.disconnect();
  }, []);

  // Prefetch data for current tab
  const { images: transmittingImages } = useImages({ status: 'transmitting', limit: 10 });
  const { state: scheduleState } = useSchedule();
  const { setPriority } = useCommand();

  return (
    <Layout>
      <div className="space-y-6 max-w-full">
        {/* Mission Status Bar - Always visible */}
        <MissionStatusBar
          schedule={scheduleState}
          transmittingCount={transmittingImages?.length || 0}
          onPriorityChange={setPriority}
        />

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        <Suspense fallback={<ScreenLoading />}>
          {activeTab === 'mission-control' && <MissionControl />}
          {activeTab === 'live-downlink' && <LiveDownlink />}
          {activeTab === 'ml-gallery' && <AiGallery onImageSelect={setSelectedImage} />}
          {activeTab === 'metrics' && <SignalAnalytics />}
          {activeTab === 'retransmit' && <RetransmissionCenter />}
          {activeTab === 'revolutions' && <OrbitWindows />}
          {activeTab === 'diagnostics' && <Diagnostics />}
          {activeTab === 'settings' && <SettingsPanel />}
        </Suspense>

        {/* Image Viewer Modal */}
        {selectedImage && (
          <ImageViewer imageId={selectedImage} onClose={() => setSelectedImage(null)} />
        )}
      </div>
    </Layout>
  );
}

function MissionStatusBar({
  schedule,
  transmittingCount,
  onPriorityChange
}: {
  schedule: any;
  transmittingCount: number;
  onPriorityChange: (p: number) => void;
}) {
  const isInWindow = schedule?.is_in_window ?? false;
  const currentRev = schedule?.current_revolution ?? 1;
  const totalRevs = schedule?.total_revs_today ?? 12;
  const downlinkCountdown = schedule?.downlink_countdown ?? '--:--';
  const nextRevCountdown = schedule?.next_rev_countdown ?? '--:--:--';

  return (
    <div className="bg-space-900/80 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isInWindow ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-space font-semibold text-lg text-white">
              {isInWindow ? 'DOWNLINK ACTIVE' : 'IN ORBIT'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-space-800 rounded-lg border border-white/10">
            <span className="text-neuronex-400 text-xs">REV</span>
            <span className="font-mono font-bold text-white">{currentRev}/{totalRevs}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
            <span className="text-green-400">▢</span>
            <span className="font-mono text-green-300">{downlinkCountdown}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
            <span className="text-blue-400">⟳</span>
            <span className="font-mono text-blue-300">{nextRevCountdown}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full">
            <span className="text-purple-400">📦</span>
            <span className="font-mono text-purple-300">{transmittingCount} TX</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabNavigation({ activeTab, onChange }: { activeTab: NavTabId; onChange: (tab: NavTabId) => void }) {
  return (
    <div className="bg-space-900/50 rounded-xl border border-white/10 overflow-hidden">
      <div className="flex overflow-x-auto pb-1" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-neuronex-400'
                : 'text-neuronex-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">{tab.icon} {tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Placeholder for Settings panel
function SettingsPanel() {
  return (
    <div className="p-6">
      <h2 className="font-space font-bold text-2xl text-white mb-6">Settings</h2>
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <p className="text-neuronex-400">Settings panel - configure mission parameters, thresholds, and display options.</p>
      </div>
    </div>
  );
}

import { useState } from 'react';

export default App;