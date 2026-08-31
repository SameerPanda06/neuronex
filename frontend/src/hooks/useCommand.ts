// Command Hook - Ground station commands to satellite - TypeScript
import { useState, useCallback } from 'react';
import { commandApi } from '../services/api';
import type { CommandResponse } from '../types';

export function useCommand() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CommandResponse | null>(null);

  const setPriority = useCallback(async (priority: number) => {
    setLoading(true);
    try {
      const res = await commandApi.setPriority(priority);
      setLastResult({ cmd: 'PRIORITY', priority, ...res.data });
      return res.data;
    } catch (e) {
      setLastResult({ error: 'Failed to set priority', status: 'error' } as any);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetSatellite = useCallback(async () => {
    setLoading(true);
    try {
      const res = await commandApi.reset();
      setLastResult({ cmd: 'RESET', ...res.data });
      return res.data;
    } catch (e) {
      setLastResult({ error: 'Failed to reset satellite', status: 'error' } as any);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const requestStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await commandApi.status();
      setLastResult({ cmd: 'STATUS_REQ', ...res.data });
      return res.data;
    } catch (e) {
      setLastResult({ error: 'Failed to request status', status: 'error' } as any);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getQueue = useCallback(async () => {
    try {
      const res = await commandApi.queue();
      return res.data;
    } catch (e) {
      return { queued: 0, status: 'error' } as any;
    }
  }, []);

  return {
    loading,
    lastResult,
    setPriority,
    resetSatellite,
    requestStatus,
    getQueue,
  };
}