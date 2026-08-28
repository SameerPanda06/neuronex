import { useState, useEffect } from 'react';
import { Layout, type NavTabId } from './components/Layout';
import { MissionControl } from './components/MissionControl/MissionControl';
import { TransmissionView } from './components/TransmissionView';
import { MLGallery } from './components/MLGallery';
import { MetricsPanel } from './components/MetricsPanel';
import { RetransmissionQueue } from './components/RetransmissionQueue';
import { RevolutionTimeline } from './components/RevolutionTimeline';
import { ImageViewer } from './components/ImageViewer';
import { dataSource } from './data';
import { Settings, Cpu } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('mission-control');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Initialize data source lifecycle
  useEffect(() => {
    dataSource.connect().catch(console.error);
    return () => dataSource.disconnect();
  }, []);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'mission-control' && (
        <MissionControl onNavigateTab={setActiveTab} />
      )}

      {activeTab === 'transmission' && (
        <div className="space-y-6">
          <TransmissionView />
        </div>
      )}

      {activeTab === 'ml-gallery' && (
        <div className="space-y-6">
          <MLGallery
            onImageClick={setSelectedImage}
            onNavigateTab={(tab) => setActiveTab(tab as NavTabId)}
          />
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <MetricsPanel />
        </div>
      )}

      {activeTab === 'retransmit' && (
        <div className="space-y-6">
          <RetransmissionQueue />
        </div>
      )}

      {activeTab === 'revolutions' && (
        <div className="space-y-6">
          <RevolutionTimeline />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-8 text-center max-w-lg mx-auto mt-12">
          <Settings className="w-12 h-12 text-cyan-400 mx-auto mb-3 opacity-60" />
          <h2 className="text-xl font-bold font-space text-white">System Settings</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Ground station link profiles, telemetry logging, and transmission buffer parameters.
          </p>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-8 text-center max-w-lg mx-auto mt-12">
          <Cpu className="w-12 h-12 text-teal-400 mx-auto mb-3 opacity-60" />
          <h2 className="text-xl font-bold font-space text-white">Hardware Diagnostics</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            ESP32 / LoRa RF frontend self-tests, packet error rate analysis, and memory telemetry.
          </p>
        </div>
      )}

      {/* Image Viewer Modal */}
      <ImageViewer imageId={selectedImage} onClose={() => setSelectedImage(null)} />
    </Layout>
  );
}

export default App;
