'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVaultStore, VaultEntry } from '@/store/vaultStore';
import { authApi } from '@/lib/api';
import {
  ChevronRight,
  CreditCard,
  FileKey2,
  FileText,
  Fingerprint,
  Heart,
  Key,
  LogOut,
  Plus,
  ScanFace,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import VaultItemCard from '@/components/VaultItemCard';
import AddItemModal from '@/components/AddItemModal';
import EditItemModal from '@/components/EditItemModal';

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Logins', value: 'login', icon: Key },
  { label: 'Cards', value: 'card', icon: CreditCard },
  { label: 'Notes', value: 'note', icon: FileText },
  { label: '2FA', value: 'totp', icon: ShieldCheck },
  { label: 'Passkeys', value: 'passkey', icon: Fingerprint },
];

export default function VaultPage() {
  const router = useRouter();
  const items = useVaultStore(s => s.items);
  const encKey = useVaultStore(s => s.encKey);
  const loadVault = useVaultStore(s => s.loadVault);
  const clearVault = useVaultStore(s => s.clearVault);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin from JWT token
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.role === 'ADMIN');
      } catch {
        // Invalid token, ignore
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      if (!encKey) {
        if (active) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        await loadVault();
      } finally {
        if (active) setLoading(false);
      }
    };

    boot();

    return () => {
      active = false;
    };
  }, [encKey, loadVault]);

  const filtered = items.filter(item => {
    if (category === 'favorite') return item.favorite;
    if (category && item.itemType !== category) return false;
    if (search) {
      const s = search.toLowerCase();
      return item.title.toLowerCase().includes(s) ||
             item.url?.toLowerCase().includes(s) ||
             item.username?.toLowerCase().includes(s) ||
             item.passkeyUsername?.toLowerCase().includes(s) ||
             item.passkeyProvider?.toLowerCase().includes(s);
    }
    return true;
  });

  const favoriteCount = items.filter(item => item.favorite).length;
  const loginCount = items.filter(item => item.itemType === 'login').length;
  const totpCount = items.filter(item => item.itemType === 'totp').length;
  const passkeyCount = items.filter(item => item.itemType === 'passkey').length;

  const handleLogout = async () => {
    await authApi.logout().catch(() => null);
    clearVault();
    sessionStorage.clear();
    localStorage.removeItem('refreshToken');
    router.push('/login');
  };

  if (!encKey && !loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="glass-panel animate-rise w-full max-w-xl rounded-[32px] p-8 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
            <Shield size={26} />
          </div>
          <h1 className="mt-6 text-4xl text-slate-900">Vault locked</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-500 sm:text-base">
            Your encryption key only lives in memory. Sign in again to derive it locally and reopen
            the vault on this device.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="mt-8 inline-flex items-center gap-2 rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Go to sign in
            <ChevronRight size={16} />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden py-6 sm:py-8">
      <div className="ambient-orb animate-float left-[-40px] top-24 h-72 w-72 bg-[rgba(240,138,93,0.18)]" />
      <div className="ambient-orb animate-float-delay right-[-70px] top-12 h-80 w-80 bg-[rgba(15,138,114,0.16)]" />

      <div className="page-frame flex flex-col gap-5">
        <header className="glass-panel animate-rise rounded-[32px] p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <Sparkles size={14} className="text-emerald-700" />
                  Secure workspace
                </div>
                <div className="space-y-3">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">NovaPass Vault</p>
                  <h1 className="text-4xl text-slate-900 sm:text-5xl">
                    Your credentials, organized like a modern product.
                  </h1>
                  <p className="max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                    Search quickly, pin favorites, and keep every entry behind client-side
                    encryption without the usual enterprise visual noise.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus size={16} />
                  Add item
                </button>
                <button
                  onClick={() => router.push('/settings')}
                  className="flex items-center justify-center gap-2 rounded-[22px] border border-[rgba(20,32,45,0.08)] bg-white/70 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white"
                >
                  <Settings size={16} />
                  Settings
                </button>
                {isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="flex items-center justify-center gap-2 rounded-[22px] border border-purple-200 bg-purple-50 px-5 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
                  >
                    <ShieldCheck size={16} />
                    Admin
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 rounded-[22px] border border-[rgba(20,32,45,0.08)] bg-white/70 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-[26px] border border-white/70 bg-white/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Total entries</p>
                <p className="mt-4 text-4xl text-slate-900">{items.length}</p>
                <p className="mt-2 text-sm text-slate-500">Across all item types.</p>
              </div>
              <div className="rounded-[26px] border border-white/70 bg-white/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Logins</p>
                <p className="mt-4 text-4xl text-slate-900">{loginCount}</p>
                <p className="mt-2 text-sm text-slate-500">{favoriteCount} pinned as favorites.</p>
              </div>
              <div className="rounded-[26px] border border-white/70 bg-white/70 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-700" />
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">2FA codes</p>
                </div>
                <p className="mt-4 text-4xl text-slate-900">{totpCount}</p>
                <p className="mt-2 text-sm text-slate-500">Live TOTP authenticators.</p>
              </div>
              <div className="rounded-[26px] border border-white/70 bg-white/70 p-5">
                <div className="flex items-center gap-2">
                  <ScanFace size={14} className="text-emerald-700" />
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Passkeys</p>
                </div>
                <p className="mt-4 text-4xl text-slate-900">{passkeyCount}</p>
                <p className="mt-2 text-sm text-slate-500">Passwordless credentials.</p>
              </div>
            </div>
          </div>
        </header>

        <section className="glass-panel animate-rise rounded-[32px] p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, URL, or username"
                className="w-full rounded-[22px] border border-[rgba(20,32,45,0.08)] bg-white/75 py-3.5 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500/35 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition ${
                    category === cat.value
                      ? 'bg-slate-950 text-white'
                      : 'border border-[rgba(20,32,45,0.08)] bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  {cat.icon && <cat.icon size={15} />}
                  {cat.label}
                </button>
              ))}
              <button
                onClick={() => setCategory('favorite')}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  category === 'favorite'
                    ? 'bg-slate-950 text-white'
                    : 'border border-[rgba(20,32,45,0.08)] bg-white/70 text-slate-600 hover:bg-white'
                }`}
              >
                <Heart size={15} />
                Favorites
              </button>
            </div>
          </div>
        </section>

        <section className="animate-rise">
          {loading ? (
            <div className="glass-panel rounded-[32px] p-10 text-center text-sm text-slate-500">
              Decrypting your vault locally...
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel rounded-[32px] p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
                <FileKey2 size={26} />
              </div>
              <h2 className="mt-6 text-3xl text-slate-900">
                {search ? 'No matching entries' : 'Your vault is ready for its first item'}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                {search
                  ? 'Try a different keyword or switch categories to widen the result set.'
                  : 'Add a login, secure note, or card and NovaPass will encrypt it before it ever leaves this device.'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-8 inline-flex items-center gap-2 rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus size={16} />
                  Add your first item
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map(item => (
                <VaultItemCard key={item.id} item={item} onEdit={setEditingItem} />
              ))}
            </div>
          )}
        </section>
      </div>

      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} />}
      {editingItem && <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} />}
    </main>
  );
}
