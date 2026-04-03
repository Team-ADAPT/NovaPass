'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import {
  Users, Key, ShieldCheck, Fingerprint,
  LogIn, UserPlus, UserCheck, Activity, RefreshCw,
} from 'lucide-react';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  usersWithTwoFactor: number;
  totalVaultItems: number;
  totalPasskeys: number;
  loginsToday: number;
  registrationsToday: number;
  dailyLogins: { date: string; count: number }[];
  dailyRegistrations: { date: string; count: number }[];
}

const STAT_CARDS = (s: SystemStats) => [
  { label: 'Total Users',      value: s.totalUsers,           icon: Users,       note: `${s.activeUsers} active` },
  { label: 'Vault Items',      value: s.totalVaultItems,      icon: Key,         note: 'Encrypted entries' },
  { label: '2FA Adoption',     value: s.totalUsers ? `${Math.round(s.usersWithTwoFactor / s.totalUsers * 100)}%` : '0%', icon: ShieldCheck, note: `${s.usersWithTwoFactor} users` },
  { label: 'Passkeys',         value: s.totalPasskeys,        icon: Fingerprint, note: 'WebAuthn credentials' },
  { label: 'Logins Today',     value: s.loginsToday,          icon: LogIn,       note: 'Successful auths' },
  { label: 'New Users Today',  value: s.registrationsToday,   icon: UserPlus,    note: 'Registrations' },
];

function MiniBar({ data, color }: { data: { date: string; count: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const pts = data.slice(-14);
  if (pts.length === 0) return <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>;
  return (
    <div className="flex items-end gap-1 h-24">
      {pts.map(p => (
        <div key={p.date} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className={`w-full rounded-t-sm ${color} opacity-80 group-hover:opacity-100 transition-opacity`}
            style={{ height: `${Math.max(4, (p.count / max) * 96)}px` }}
          />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
            {p.date}: {p.count}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await adminApi.getStats();
      setStats(data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
    </div>
  );

  if (error) return (
    <div className="glass-panel rounded-[24px] p-6 text-rose-600 text-sm">{error}</div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Overview</p>
          <h1 className="text-3xl text-slate-900 mt-1">Dashboard</h1>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-[18px] border border-[rgba(20,32,45,0.08)] bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {STAT_CARDS(stats).map(({ label, value, icon: Icon, note }) => (
          <div key={label} className="glass-panel rounded-[24px] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
                <p className="mt-3 text-3xl text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                <p className="mt-1 text-xs text-slate-400">{note}</p>
              </div>
              <div className="rounded-[14px] bg-emerald-500/10 p-2.5 text-emerald-700">
                <Icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 mb-4">Logins — last 14 days</p>
          <MiniBar data={stats.dailyLogins} color="bg-emerald-500" />
        </div>
        <div className="glass-panel rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 mb-4">Registrations — last 14 days</p>
          <MiniBar data={stats.dailyRegistrations} color="bg-slate-700" />
        </div>
      </div>

      {/* Quick links */}
      <div className="glass-panel rounded-[24px] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 mb-4">Quick Actions</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => router.push('/admin/users')}
            className="flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition">
            <Users size={14} /> Manage Users
          </button>
          <button onClick={() => router.push('/admin/audit')}
            className="flex items-center gap-2 rounded-[18px] border border-[rgba(20,32,45,0.08)] bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white transition">
            <Activity size={14} /> View Audit Logs
          </button>
        </div>
      </div>
    </div>
  );
}
