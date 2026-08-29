import { lazy, Suspense, useState, useEffect } from 'react';
import { Layout, type NavTabId } from './components/Layout';
import { dataSource } from './data';
import { Settings } from 'lucide-react';

const MissionControl = lazy(() => import('./components/MissionControl/MissionControl').then((module) => ({ default: module.MissionControl })));
const LiveDownlink = lazy(() => import('./components/LiveDownlink/LiveDownlink').then((module) => ({ default: module.LiveDownlink })));
const AiGallery = lazy(() => import('./components/AiGallery/AiGallery').then((module) => ({ default: module.AiGallery })));
const SignalAnalytics = lazy(() => import('./components/SignalAnalytics/SignalAnalytics').then((module) => ({ default: module.SignalAnalytics })));
const RetransmissionCenter = lazy(() => import('./components/RetransmissionCenter/RetransmissionCenter').then((module) => ({ default: module.RetransmissionCenter })));
const OrbitWindows = lazy(() => import('./components/OrbitWindows/OrbitWindows').then((module) => ({ default: module.OrbitWindows })));
const Diagnostics = lazy(() => import('./components/Diagnostics').then((module) => ({ default: module.Diagnostics })));

function ScreenLoading() {
  return (
    <div className="min-h-[240px] rounded-xl border border-cyan-900/30 bg-[#0B132B]/60 flex items-center justify-center">
      <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-cyan-400">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        LOADING MISSION VIEW
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('mission-control');

  // Initialize data source lifecycle
  useEffect(() => {
    void dataSource.connect();
    return () => dataSource.disconnect();
  }, []);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <Suspense fallback={<ScreenLoading />}>
      {activeTab === 'mission-control' && (
        <MissionControl onNavigateTab={setActiveTab} />
      )}

      {activeTab === 'transmission' && (
        <div className="space-y-6">
          <LiveDownlink />
        </div>
      )}

      {activeTab === 'ml-gallery' && (
        <div className="space-y-6">
          <AiGallery
            onNavigateTab={(tab) => setActiveTab(tab as NavTabId)}
          />
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <SignalAnalytics />
        </div>
      )}

      {activeTab === 'retransmit' && (
        <div className="space-y-6">
          <RetransmissionCenter />
        </div>
      )}

      {activeTab === 'revolutions' && (
        <div className="space-y-6">
          <OrbitWindows />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-8 text-center max-w-lg mx-auto mt-12">
          <Settings className="w-12 h-12 text-cyan-400 mx-auto mb-3 opacity-60" />
          <h2 className="text-xl font-bold font-space text-white">System Settings</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Placeholder — operational configuration remains environment-managed for this build.
          </p>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <Diagnostics />
      )}
      </Suspense>
    </Layout>
  );
}

export default App;
