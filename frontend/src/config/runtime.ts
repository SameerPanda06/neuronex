export type DataMode = 'mock' | 'live';

export interface RuntimeConfig {
  dataMode: DataMode;
  apiBaseUrl: string;
  socketUrl: string;
  isMockMode: boolean;
  isLiveMode: boolean;
}

const rawMode = (import.meta.env.VITE_DATA_MODE || 'mock').toLowerCase().trim();
const dataMode: DataMode = rawMode === 'live' ? 'live' : 'mock';

export const runtimeConfig: RuntimeConfig = {
  dataMode,
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  socketUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:5000',
  isMockMode: dataMode === 'mock',
  isLiveMode: dataMode === 'live',
};

export const {
  dataMode: DATA_MODE,
  apiBaseUrl: API_BASE_URL,
  socketUrl: SOCKET_URL,
  isMockMode: IS_MOCK_MODE,
  isLiveMode: IS_LIVE_MODE,
} = runtimeConfig;
