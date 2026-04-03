'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import {
  Search, ChevronLeft, ChevronRight, RefreshCw,
  LogIn, LogOut, UserPlus, Key, Shield, Trash2, Edit, Fingerprint, Filter, X,
} from 'lucide-react';

interface AuditLogEntry {
  id: number;
  userId: number | null;
  userEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: number | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_META: Record<string, { icon: React.ReactNode; color: string }> = {
  LOGIN:              { icon: <LogIn size={12} />,      color: 'bg-emerald-100 text-emerald-700' },
  LOGOUT:             { icon: <LogOut size={12} />,     color: 'bg-slate-100 text-slate-600' },
  REGISTER:           { icon: <UserPlus size={12} />,   color: 'bg-blue-100 text-blue-700' },
  VAULT_CREATE:       { icon: <Key size={12} />,        color: 'bg-emerald-100 text-emerald-700' },
  VAULT_UPDATE:       { icon: <Edit size={12} />,       color: 'bg-amber-100 text-amber-700' },
  VAULT_DELETE:       { icon: <Trash2 size={12} />,     color: 'bg-rose-100 text-rose-600' },
  TWO_FACTOR_ENABLE:  { icon: <Shield size={12} />,     color: 'bg-purple-100 text-purple-700' },
  TWO_FACTOR_DISABLE: { icon: <Shield size={12} />,     color: 'bg-orange-100 text-orange-700' },
  PASSKEY_REGISTER:   { icon: <Fingerprint size={12} />,color: 'bg-pink-100 text-pink-700' },
  PASSKEY_DELETE:     { icon: <Fingerprint size={12} />,color: 'bg-rose-100 text-rose-600' },
  ADMIN_UPDATE_USER:  { icon: <Edit size={12} />,       color: 'bg-indigo-100 text-indigo-700' },
  ADMIN_DELETE_USER:  { icon: <Trash2 size={12} />,     color: 'bg-rose-100 text-rose-600' },
  ADMIN_FORCE_LOGOUT: { icon: <LogOut size={12} />,     color: 'bg-orange-100 text-orange-700' },
};

const ACTIONS = Object.keys(ACTION_META);

function fmt(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action] ?? { icon: null, color: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.color}`}>
      {meta.icon}
      {action.replace(/_/g, ' ')}
    </span>
  );
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await adminApi.listAuditLogs(
        page, 50,
        userFilter ? Number(userFilter) : undefined,
        actionFilter || undefined,
      );
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load logs');
    } finally { setLoading(false); }
  }, [page, actionFilter, userFilter]);

  useEffect(() => { load(); }, [load]);

  const clearFilters = () => { setActionFilter(''); setUserFilter(''); setPage(0); };
  const hasFilters = actionFilter || userFilter;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Security</p>
          <h1 className="text-3xl text-slate-900 mt-1">Audit Logs <span className="text-slate-400 text-xl">({totalElements})</span></h1>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 rounded-[18px] border border-[rgba(20,32,45,0.08)] bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 rounded-[18px] border px-4 py-2 text-sm font-medium transition ${
            showFilters ? 'bg-slate-950 text-white border-slate-950' : 'border-[rgba(20,32,45,0.08)] bg-white/70 text-slate-600 hover:bg-white'
          }`}>
          <Filter size={13} />
          Filters
          {hasFilters && <span className="h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">!</span>}
        </button>
        {hasFilters && (
          <button onClick={clearFilters}
            className="flex items-center gap-1.5 rounded-[18px] border border-[rgba(20,32,45,0.08)] bg-white/70 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white transition">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="glass-panel rounded-[20px] p-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1.5">Action</label>
            <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }}
              className="rounded-[14px] border border-[rgba(20,32,45,0.08)] bg-white/80 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value="">All actions</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1.5">User ID</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(0); }}
                placeholder="e.g. 42"
                className="rounded-[14px] border border-[rgba(20,32,45,0.08)] bg-white/80 pl-8 pr-3 py-2 text-sm text-slate-700 w-28 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          </div>
        </div>
      )}

      {error && <div className="glass-panel rounded-[20px] p-4 text-sm text-rose-600">{error}</div>}

      {/* Table */}
      <div className="glass-panel rounded-[24px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(20,32,45,0.08)]">
                {['Time', 'Action', 'User', 'Resource', 'IP'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center">
                  <div className="h-6 w-6 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto" />
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">No logs found</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-[rgba(20,32,45,0.05)] hover:bg-white/40 transition-colors last:border-0">
                  <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{fmt(log.createdAt)}</td>
                  <td className="px-5 py-3"><ActionBadge action={log.action} /></td>
                  <td className="px-5 py-3">
                    {log.userEmail
                      ? <div><p className="text-sm text-slate-700">{log.userEmail}</p><p className="text-[11px] text-slate-400">ID {log.userId}</p></div>
                      : <span className="text-xs text-slate-400">System</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {log.resourceType ? `${log.resourceType}${log.resourceId ? ` #${log.resourceId}` : ''}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400 font-mono">{log.ipAddress || '—'}</td>
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
    </div>
  );
}
