import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { Layout } from './components/Layout';
import { TransmissionView } from './components/TransmissionView';
import { MLGallery } from './components/MLGallery';
import { MetricsPanel } from './components/MetricsPanel';
import { RetransmissionQueue } from './components/RetransmissionQueue';
import { ImageViewer } from './components/ImageViewer';
import { RevolutionTimeline } from './components/RevolutionTimeline';
import { dataSource } from './data';

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Initialize data source lifecycle
  useEffect(() => {
    dataSource.connect().catch(console.error);
    return () => dataSource.disconnect();
  }, []);

  return (
    <Layout>
      <div className="space-y-8 max-w-full">
        {/* Transmission View - Always visible at top */}
        <TransmissionView />

        {/* Tabbed Content */}
        <div className="bg-space-900/50 rounded-xl border border-white/10 overflow-hidden">
          <Tabs defaultValue="gallery">
            <TabsList className="grid w-full grid-cols-4 border-b border-white/10">
              <TabsTrigger value="gallery" className="py-3">
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4">📸</span>
                  ML Gallery
                </span>
              </TabsTrigger>
              <TabsTrigger value="metrics" className="py-3">
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4">📊</span>
                  Signal Metrics
                </span>
              </TabsTrigger>
              <TabsTrigger value="retransmit" className="py-3">
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4">🔄</span>
                  Retransmissions
                </span>
              </TabsTrigger>
              <TabsTrigger value="revolutions" className="py-3">
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4">📅</span>
                  Revolutions
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gallery" className="p-6">
              <MLGallery onImageClick={setSelectedImage} />
            </TabsContent>

            <TabsContent value="metrics" className="p-6">
              <MetricsPanel />
            </TabsContent>

            <TabsContent value="retransmit" className="p-6">
              <RetransmissionQueue />
            </TabsContent>

            <TabsContent value="revolutions" className="p-6">
              <RevolutionTimeline />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Image Viewer Modal */}
      <ImageViewer imageId={selectedImage} onClose={() => setSelectedImage(null)} />
    </Layout>
  );
}

// Simple Tabs implementation using React Context
const TabsContext = createContext<{ value: string; onValueChange: (v: string) => void }>({ value: '', onValueChange: () => {} });

function Tabs({ children, defaultValue }: { children: ReactNode; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, onValueChange: setValue }}>
      <div>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className} role="tablist">{children}</div>;
}

function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { value: activeValue, onValueChange } = useContext(TabsContext);
  const isActive = activeValue === value;
  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={`flex items-center justify-center font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-neuronex-500 ${
        isActive
          ? 'bg-neuronex-500/20 text-neuronex-400 border-b-2 border-neuronex-500'
          : 'text-neuronex-500 hover:text-white hover:bg-white/5'
      } ${className || ''}`}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { value: activeValue } = useContext(TabsContext);
  if (activeValue !== value) return null;
  return <div className={className} role="tabpanel">{children}</div>;
}

export default App;
