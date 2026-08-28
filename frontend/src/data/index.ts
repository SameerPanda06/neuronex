import { IS_MOCK_MODE } from '../config/runtime';
import type { DataSource } from './types';
import { MockDataSource } from './mock/mockDataSource';
import { LiveDataSource } from './live/liveDataSource';

export * from './types';

// Singleton instance of the active data source determined by runtime config
export const dataSource: DataSource = IS_MOCK_MODE ? new MockDataSource() : new LiveDataSource();
