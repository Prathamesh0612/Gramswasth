import { useEffect, useState, useCallback } from 'react';
import offlineDB from '../db/offlineDB';
import { syncAPI } from '../services/api';
import useNetworkStatus from './useNetworkStatus';

export default function useOfflineSync() {
  const isOnline = useNetworkStatus();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);

  const syncNow = useCallback(async () => {
    setError(null);
    const pendingConsultations = await offlineDB.pending_consultations.toArray();
    const pendingMessages = await offlineDB.pending_messages.toArray();
    const offlineRecords = await offlineDB.offline_records.toArray();

    if (
      pendingConsultations.length === 0 &&
      pendingMessages.length === 0 &&
      offlineRecords.length === 0
    ) {
      return;
    }

    try {
      setSyncing(true);
      const payload = {
        consultations: pendingConsultations,
        messages: pendingMessages,
        records: offlineRecords,
      };
      const res = await syncAPI.syncData(payload);
      if (!res.success) {
        throw new Error(res.error || 'Sync failed');
      }

      await offlineDB.pending_consultations.clear();
      await offlineDB.pending_messages.clear();
      await offlineDB.offline_records.clear();
      setLastSync(new Date().toISOString());
    } catch (e) {
      console.error('Offline sync failed', e);
      setError(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (isOnline) {
      syncNow();
    }
  }, [isOnline, syncNow]);

  return { syncing, lastSync, error, syncNow };
}

