import { AiGallery } from './AiGallery/AiGallery';

interface MLGalleryProps {
  onImageClick?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export function MLGallery({ onNavigateTab }: MLGalleryProps) {
  return <AiGallery onNavigateTab={onNavigateTab} />;
}