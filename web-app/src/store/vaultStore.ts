import { create } from 'zustand';
import { vaultApi } from '@/lib/api';
import { encryptVaultItem, decryptVaultItem } from '@/lib/crypto';

export interface VaultEntry {
  id: number;
  itemType: string;
  title: string;
  url?: string;
  favorite: boolean;
  version: number;
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
  setEncKey: (key: CryptoKey | null) => void;
  clearVault: () => void;
  loadVault: () => Promise<void>;
  addItem: (item: Omit<VaultEntry, 'id' | 'version'>) => Promise<void>;
  updateItem: (id: number, item: Partial<VaultEntry>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  items: [],
  encKey: null,

  setEncKey: (key) => set({ encKey: key }),
  clearVault: () => set({ items: [], encKey: null }),

  loadVault: async () => {
    const { encKey } = get();
    if (!encKey) return;
    const { data } = await vaultApi.getAll();
    const items: VaultEntry[] = await Promise.all(
      data.map(async (raw: any) => {
        const plain = JSON.parse(await decryptVaultItem(raw.encryptedData, encKey));
        return { id: raw.id, itemType: raw.itemType, title: raw.title,
                 url: raw.url, favorite: raw.favorite, version: raw.version, ...plain };
      })
    );
    set({
      items: items.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title)),
    });
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
        .map(i => i.id === id ? { ...merged, version: data.version } : i)
        .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title)),
    }));
  },

  deleteItem: async (id) => {
    await vaultApi.delete(id);
    set(s => ({ items: s.items.filter(i => i.id !== id) }));
  },
}));
