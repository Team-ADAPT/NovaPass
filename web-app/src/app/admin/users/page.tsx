'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import {
  Search, MoreVertical, Shield, ShieldOff, LogOut,
  Trash2, ChevronLeft, ChevronRight, Key, Fingerprint,
  User as UserIcon, X, Clock, ShieldCheck,
} from 'lucide-react';

interface UserSummary {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  active: boolean;
  twoFactorEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  vaultItemCount: number;
  passkeyCount: number;
}

interface UserDetail extends UserSummary {
  updatedAt: string;
  recentActivity: { id: number; action: string; createdAt: string; ipAddress: string | null }[];
}

function fmt(d: string | null) {
  if (!d) return 'Never';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function UserDrawer({ userId, onClose, onRefresh }: { userId: number; onClose: () => void; onRefresh: () => void }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    adminApi.getUserDetail(userId).then(({ data }) => setUser(data)).finally(() => setLoading(false));
  }, [userId]);

  const act = async (fn: () => Promise<any>, confirm_msg?: string) => {
    if (confirm_msg && !confirm(confirm_msg)) return;
    setActing(true);
    try { await fn(); onRefresh(); onClose(); }
    catch (e: any) { alert(e.response?.data?.message || 'Action failed'); }
    finally { setActing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-md glass-panel rounded-l-[28px] rounded-r-none flex flex-col overflow-y-auto animate-rise">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(20,32,45,0.08)]">
          <p className="font-semibold text-slate-900">User Detail</p>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/60 transition"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-7 w-7 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          </div>
        ) : user ? (
          <div className="flex-1 p-6 space-y-6">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <UserIcon size={24} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{user.username}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
                <div className="flex gap-2 mt-1.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                    {user.active ? 'Active' : 'Disabled'}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Vault Items', value: user.vaultItemCount, icon: Key },
                { label: 'Passkeys', value: user.passkeyCount, icon: Fingerprint },
                { label: '2FA', value: user.twoFactorEnabled ? 'On' : 'Off', icon: ShieldCheck },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-[18px] border border-[rgba(20,32,45,0.08)] bg-white/60 p-3 text-center">
                  <Icon size={14} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-lg font-semibold text-slate-900">{value}</p>
                  <p className="text-[11px] text-slate-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Timestamps */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500"><span>Joined</span><span className="text-slate-700">{fmt(user.createdAt)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Last login</span><span className="text-slate-700">{fmt(user.lastLogin)}</span></div>
            </div>

            {/* Recent activity */}
            {user.recentActivity?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 mb-3">Recent Activity</p>
                <div className="space-y-2">
                  {user.recentActivity.slice(0, 6).map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-[14px] border border-[rgba(20,32,45,0.06)] bg-white/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-600">{a.action.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{fmt(a.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-[rgba(20,32,45,0.08)]">
              <button disabled={acting} onClick={() => act(() => adminApi.updateUser(user.id, { active: !user.active }))}
                className="w-full flex items-center gap-2 rounded-[16px] border border-[rgba(20,32,45,0.08)] bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white transition disabled:opacity-50">
                {user.active ? <><ShieldOff size={14} /> Disable Account</> : <><Shield size={14} /> Enable Account</>}
              </button>
              <button disabled={acting} onClick={() => act(() => adminApi.updateUser(user.id, { role: user.role === 'ADMIN' ? 'USER' : 'ADMIN' }), `Change role to ${user.role === 'ADMIN' ? 'USER' : 'ADMIN'}?`)}
                className="w-full flex items-center gap-2 rounded-[16px] border border-[rgba(20,32,45,0.08)] bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white transition disabled:opacity-50">
                <ShieldCheck size={14} /> {user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
              </button>
              <button disabled={acting} onClick={() => act(() => adminApi.forceLogout(user.id), `Force logout ${user.email}?`)}
                className="w-full flex items-center gap-2 rounded-[16px] border border-[rgba(20,32,45,0.08)] bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white transition disabled:opacity-50">
                <LogOut size={14} /> Force Logout
              </button>
              <button disabled={acting} onClick={() => act(() => adminApi.deleteUser(user.id), `Permanently delete ${user.email}? This cannot be undone.`)}
                className="w-full flex items-center gap-2 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-100 transition disabled:opacity-50">
                <Trash2 size={14} /> Delete User
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [acting, setActing] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await adminApi.listUsers(page, 20, search || undefined);
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load users');
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-menu]')) setMenuId(null); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const quickAct = async (userId: number, fn: () => Promise<any>, msg?: string) => {
    if (msg && !confirm(msg)) return;
    setActing(userId); setMenuId(null);
    try { await fn(); await load(); }
    catch (e: any) { alert(e.response?.data?.message || 'Action failed'); }
    finally { setActing(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Management</p>
          <h1 className="text-3xl text-slate-900 mt-1">Users <span className="text-slate-400 text-xl">({totalElements})</span></h1>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search email or username…"
          className="w-full rounded-[20px] border border-[rgba(20,32,45,0.08)] bg-white/75 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/35"
        />
      </div>

      {error && <div className="glass-panel rounded-[20px] p-4 text-sm text-rose-600">{error}</div>}

      {/* Table */}
      <div className="glass-panel rounded-[24px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(20,32,45,0.08)]">
                {['User', 'Role', 'Security', 'Items', 'Last Login', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <div className="h-6 w-6 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto" />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className="border-b border-[rgba(20,32,45,0.05)] hover:bg-white/50 cursor-pointer transition-colors last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <UserIcon size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{u.username}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                    }`}>{u.active ? 'Active' : 'Disabled'}</span>
                    {u.role === 'ADMIN' && <span className="ml-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Admin</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5">
                      {u.twoFactorEnabled && <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">2FA</span>}
                      {u.passkeyCount > 0 && <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-pink-100 text-pink-700">{u.passkeyCount} key{u.passkeyCount > 1 ? 's' : ''}</span>}
                      {!u.twoFactorEnabled && u.passkeyCount === 0 && <span className="text-xs text-slate-400">Basic</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Key size={12} className="text-slate-400" />{u.vaultItemCount}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">{fmt(u.lastLogin)}</td>
                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                    <div className="relative flex justify-end" data-menu>
                      <button
                        onClick={e => { e.stopPropagation(); setMenuId(menuId === u.id ? null : u.id); }}
                        disabled={acting === u.id}
                        className="rounded-full p-1.5 hover:bg-white/80 transition"
                      >
                        {acting === u.id
                          ? <div className="h-4 w-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                          : <MoreVertical size={15} className="text-slate-400" />}
                      </button>
                      {menuId === u.id && (
                        <div className="absolute right-0 top-8 w-44 glass-panel rounded-[16px] py-1 z-20 shadow-xl">
                          <button onClick={() => quickAct(u.id, () => adminApi.updateUser(u.id, { active: !u.active }))}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-white/60 transition">
                            {u.active ? <><ShieldOff size={13} />Disable</> : <><Shield size={13} />Enable</>}
                          </button>
                          <button onClick={() => quickAct(u.id, () => adminApi.updateUser(u.id, { role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' }), `Change role to ${u.role === 'ADMIN' ? 'USER' : 'ADMIN'}?`)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-white/60 transition">
                            <ShieldCheck size={13} />{u.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                          </button>
                          <button onClick={() => quickAct(u.id, () => adminApi.forceLogout(u.id), `Force logout ${u.email}?`)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-white/60 transition">
                            <LogOut size={13} />Force Logout
                          </button>
                          <div className="my-1 border-t border-[rgba(20,32,45,0.08)]" />
                          <button onClick={() => quickAct(u.id, () => adminApi.deleteUser(u.id), `Delete ${u.email}? Cannot be undone.`)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition">
                            <Trash2 size={13} />Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(20,32,45,0.08)]">
            <p className="text-xs text-slate-400">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="rounded-full p-1.5 hover:bg-white/60 disabled:opacity-30 transition">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="rounded-full p-1.5 hover:bg-white/60 disabled:opacity-30 transition">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId !== null && (
        <UserDrawer userId={selectedId} onClose={() => setSelectedId(null)} onRefresh={load} />
      )}
    </div>
  );
}
