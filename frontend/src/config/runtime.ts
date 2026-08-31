export type DataMode = 'mock' | 'live' | 'replay';

export interface RuntimeConfig {
  dataMode: DataMode;
  apiBaseUrl: string;
  socketUrl: string;
  isMockMode: boolean;
  isLiveMode: boolean;
  isReplayMode: boolean;
  replaySpeed: number;
}

const rawMode = (import.meta.env.VITE_DATA_MODE || 'mock').toLowerCase().trim();
const dataMode: DataMode = rawMode === 'live' || rawMode === 'replay' ? rawMode : 'mock';
const configuredReplaySpeed = Number(import.meta.env.VITE_REPLAY_SPEED);

export const runtimeConfig: RuntimeConfig = {
  dataMode,
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000',
  socketUrl: import.meta.env.VITE_WS_URL || 'http://127.0.0.1:5000',
  isMockMode: dataMode === 'mock',
  isLiveMode: dataMode === 'live',
  isReplayMode: dataMode === 'replay',
  replaySpeed: Number.isFinite(configuredReplaySpeed) && configuredReplaySpeed > 0 ? configuredReplaySpeed : 1,
};


export const {
  dataMode: DATA_MODE,
  apiBaseUrl: API_BASE_URL,
  socketUrl: SOCKET_URL,
  isMockMode: IS_MOCK_MODE,
  isLiveMode: IS_LIVE_MODE,
  isReplayMode: IS_REPLAY_MODE,
  replaySpeed: REPLAY_SPEED,
} = runtimeConfig;
