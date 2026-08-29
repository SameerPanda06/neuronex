import { useState, useEffect, useCallback } from 'react';
import { dataSource } from '../data';
import type { ConnectionState, ConnectionStatusType } from '../data/types';

export function useConnection() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(() =>
    dataSource.getConnectionState()
  );

  useEffect(() => {
    const unsubscribe = dataSource.subscribeConnectionState((state) => {
      setConnectionState(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const connect = useCallback(() => dataSource.connect(), []);
  const disconnect = useCallback(() => dataSource.disconnect(), []);

  return {
    ...connectionState,
    connect,
    disconnect,
  };
}

export type { ConnectionState, ConnectionStatusType };
