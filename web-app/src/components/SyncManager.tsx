'use client';

import { useEffect } from 'react';
import { useVaultStore } from '@/store/vaultStore';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function SyncManager() {
  const { syncVault, encKey } = useVaultStore();

  useEffect(() => {
    if (!encKey) return;

    // Initial sync
    syncVault();

    const interval = setInterval(() => {
      syncVault();
    }, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [encKey, syncVault]);

  return null;
}
