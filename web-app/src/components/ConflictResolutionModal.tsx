'use client';

import { useVaultStore } from '@/store/vaultStore';
import { AlertCircle } from 'lucide-react';

export default function ConflictResolutionModal() {
  const { conflicts, resolveConflict } = useVaultStore();

  if (conflicts.length === 0) return null;

  const conflict = conflicts[0]; // Resolve one at a time

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-neutral-200 dark:border-neutral-800">
        <div className="p-6">
          <div className="flex items-center gap-3 text-amber-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-xl font-bold font-display">Sync Conflict Detected</h3>
          </div>
          
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            An item has been modified on another device. How would you like to resolve this?
          </p>

          <div className="space-y-3">
            <button
              onClick={() => resolveConflict(conflict.vaultItemId, 'USE_SERVER')}
              className="w-full p-4 text-left rounded-xl border-2 border-neutral-100 dark:border-neutral-800 hover:border-blue-500 transition-all group"
            >
              <div className="font-bold text-neutral-900 dark:text-white group-hover:text-blue-500">
                Keep Server Version
              </div>
              <div className="text-sm text-neutral-500">
                Discard local changes and use the version stored in the cloud.
              </div>
            </button>

            <button
              onClick={() => resolveConflict(conflict.vaultItemId, 'USE_CLIENT')}
              className="w-full p-4 text-left rounded-xl border-2 border-neutral-100 dark:border-neutral-800 hover:border-blue-500 transition-all group"
            >
              <div className="font-bold text-neutral-900 dark:text-white group-hover:text-blue-500">
                Keep Local Version
              </div>
              <div className="text-sm text-neutral-500">
                Overwrite the server version with your current local changes.
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
