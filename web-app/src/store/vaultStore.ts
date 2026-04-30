import { create } from 'zustand';
import { vaultApi, syncApi } from '@/lib/api';
import { encryptVaultItem, decryptVaultItem } from '@/lib/crypto';

export interface VaultEntry {
  id: number;
  itemType: string;
  title: string;
  url?: string;
  favorite: boolean;
  version: number;
  updatedAt?: string;
  // Decrypted fields (never persisted to server)
  username?: string;
  password?: string;
  notes?: string;
  // TOTP fields
  totpSecret?: string;
  // Passkey fields (stored credential info for reference)
  passkeyUsername?: string;
  passkeyProvider?: string; // e.g. 'Google', 'Apple', 'GitHub'
}

interface VaultStore {
  items: VaultEntry[];
  encKey: CryptoKey | null;
  deviceId: string | null;
  lastSynced: string | null;
  isSyncing: boolean;
  conflicts: any[];
  setEncKey: (key: CryptoKey | null) => void;
  clearVault: () => void;
  loadVault: () => Promise<void>;
  addItem: (item: Omit<VaultEntry, 'id' | 'version'>) => Promise<void>;
  updateItem: (id: number, item: Partial<VaultEntry>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  syncVault: () => Promise<void>;
  initDevice: () => Promise<void>;
  resolveConflict: (itemId: number, resolution: 'USE_SERVER' | 'USE_CLIENT') => Promise<void>;
}

const SYNC_RETRY_DELAY = 1000;
const MAX_SYNC_RETRIES = 3;

export const useVaultStore = create<VaultStore>((set, get) => ({
  items: [],
  encKey: null,
  deviceId: null,
  lastSynced: null,
  isSyncing: false,
  conflicts: [],

  setEncKey: (key) => set({ encKey: key }),
  clearVault: () => set({ items: [], encKey: null, lastSynced: null, conflicts: [] }),

  initDevice: async () => {
    let deviceId = localStorage.getItem('novapass_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('novapass_device_id', deviceId);
      
      // Try to register with backend
      try {
        await syncApi.registerDevice({
          deviceId,
          deviceName: navigator.userAgent.split(')')[0].split('(')[1] || 'Web Browser',
          deviceType: 'BROWSER'
        });
      } catch (err) {
        console.error('Failed to register device:', err);
      }
    }
    set({ deviceId });
  },

  loadVault: async () => {
    const { encKey, initDevice, deviceId } = get();
    if (!encKey) return;
    if (!deviceId) await initDevice();

    const { data } = await vaultApi.getAll();
    const items: VaultEntry[] = await Promise.all(
      data.map(async (raw: any) => {
        try {
          const plain = JSON.parse(await decryptVaultItem(raw.encryptedData, encKey));
          return { id: raw.id, itemType: raw.itemType, title: raw.title,
                   url: raw.url, favorite: raw.favorite, version: raw.version, 
                   updatedAt: raw.updatedAt, ...plain };
        } catch (e) {
          console.error('Failed to decrypt item', raw.id, e);
          return { id: raw.id, itemType: raw.itemType, title: raw.title,
                   url: raw.url, favorite: raw.favorite, version: raw.version,
                   updatedAt: raw.updatedAt };
        }
      })
    );
    set({
      items: items.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title)),
      lastSynced: new Date().toISOString()
    });
  },

  syncVault: async () => {
    const { encKey, lastSynced, isSyncing, deviceId } = get();
    if (!encKey || isSyncing || !deviceId) return;

    set({ isSyncing: true });

    const attemptSync = async (retries = 0): Promise<void> => {
      try {
        const { data } = await syncApi.vaultSync({ deviceId, lastSyncAt: lastSynced });
        
        if (data.conflicts && data.conflicts.length > 0) {
          set({ conflicts: data.conflicts, isSyncing: false });
          return;
        }

        if (data.updated && data.updated.length > 0) {
          const updatedItems = await Promise.all(
            data.updated.map(async (raw: any) => {
              const plain = JSON.parse(await decryptVaultItem(raw.encryptedData, encKey));
              return { id: raw.id, itemType: raw.itemType, title: raw.title,
                       url: raw.url, favorite: raw.favorite, version: raw.version, 
                       updatedAt: raw.updatedAt, ...plain };
            })
          );

          set(s => {
            const newItems = [...s.items];
            updatedItems.forEach(u => {
              const idx = newItems.findIndex(i => i.id === u.id);
              if (idx > -1) newItems[idx] = u;
              else newItems.push(u);
            });
            return {
              items: newItems.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title)),
              lastSynced: data.syncedAt || new Date().toISOString(),
              isSyncing: false
            };
          });
        } else {
          set({ lastSynced: data.syncedAt || new Date().toISOString(), isSyncing: false });
        }
      } catch (error) {
        if (retries < MAX_SYNC_RETRIES) {
          const delay = SYNC_RETRY_DELAY * Math.pow(2, retries);
          setTimeout(() => attemptSync(retries + 1), delay);
        } else {
          console.error('Sync failed after retries', error);
          set({ isSyncing: false });
        }
      }
    };

    await attemptSync();
  },

  resolveConflict: async (itemId, resolution) => {
    const { encKey, items } = get();
    if (!encKey) return;

    if (resolution === 'USE_CLIENT') {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const { username, password, notes, totpSecret, passkeyUsername, passkeyProvider } = item;
        const encryptedData = await encryptVaultItem(
          JSON.stringify({ username, password, notes, totpSecret, passkeyUsername, passkeyProvider }), encKey
        );
        await syncApi.resolveConflict(itemId, { resolution: 'USE_CLIENT', mergedEncryptedData: encryptedData });
      }
    } else {
      await syncApi.resolveConflict(itemId, { resolution: 'USE_SERVER' });
    }

    set(s => ({ conflicts: s.conflicts.filter(c => c.vaultItemId !== itemId) }));
    get().syncVault();
  },

  addItem: async (item) => {
    const { encKey } = get();
    if (!encKey) throw new Error('Vault locked');
    const { username, password, notes, totpSecret, passkeyUsername, passkeyProvider, ...meta } = item;
    const encryptedData = await encryptVaultItem(
      JSON.stringify({ username, password, notes, totpSecret, passkeyUsername, passkeyProvider }), encKey
    );
    const { data } = await vaultApi.create({ ...meta, encryptedData });
    const plain = JSON.parse(await decryptVaultItem(data.encryptedData, encKey));
    set(s => ({
      items: [...s.items, { ...data, ...plain }]
        .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title)),
    }));
    get().syncVault();
  },

  updateItem: async (id, updates) => {
    const { encKey, items } = get();
    if (!encKey) throw new Error('Vault locked');
    const existing = items.find(i => i.id === id)!;
    const merged = { ...existing, ...updates };
    const { username, password, notes, totpSecret, passkeyUsername, passkeyProvider } = merged;
    const encryptedData = await encryptVaultItem(
      JSON.stringify({ username, password, notes, totpSecret, passkeyUsername, passkeyProvider }), encKey
    );
    const { data } = await vaultApi.update(id, {
      title: merged.title, url: merged.url, favorite: merged.favorite,
      version: merged.version, encryptedData
    });
    set(s => ({
      items: s.items
        .map(i => i.id === id ? { ...merged, version: data.version, updatedAt: data.updatedAt } : i)
        .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title)),
    }));
    get().syncVault();
  },

  deleteItem: async (id) => {
    await vaultApi.delete(id);
    set(s => ({ items: s.items.filter(i => i.id !== id) }));
    get().syncVault();
  },
}));
