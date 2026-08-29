import { DATA_MODE } from '../config/runtime';
import type { DataSource } from './types';
import { MockDataSource } from './mock/mockDataSource';
import { LiveDataSource } from './live/liveDataSource';
import { ReplayDataSource } from './replay/replayDataSource';

export * from './types';

// Singleton instance of the active data source determined by runtime config
function createDataSource(): DataSource {
  switch (DATA_MODE) {
    case 'mock': return new MockDataSource();
    case 'live': return new LiveDataSource();
    case 'replay': return new ReplayDataSource();
    default: {
      const exhaustive: never = DATA_MODE;
      throw new Error(`Unsupported data mode: ${exhaustive}`);
    }
  }
}

export const dataSource: DataSource = createDataSource();
