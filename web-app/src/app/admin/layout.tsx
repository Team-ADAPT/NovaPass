'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  ScrollText,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/audit', label: 'Audit Logs', icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    try {
      const { role } = JSON.parse(atob(token.split('.')[1]));
      if (role === 'ADMIN') setReady(true);
      else { setDenied(true); setTimeout(() => router.push('/vault'), 2000); }
    } catch {
      router.push('/login');
    }
  }, [router]);

  if (denied) return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="glass-panel rounded-[28px] p-8 text-center max-w-sm">
        <ShieldCheck size={32} className="mx-auto text-rose-500 mb-4" />
        <p className="text-slate-900 font-semibold">Access Denied</p>
        <p className="text-sm text-slate-500 mt-2">Admin privileges required. Redirecting…</p>
      </div>
    </main>
  );

  if (!ready) return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
    </main>
  );

  const Sidebar = () => (
    <aside className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[rgba(20,32,45,0.08)]">
        <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-slate-950">
          <ShieldCheck size={18} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-none">NovaPass</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mt-0.5">Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-1 p-3 border-t border-[rgba(20,32,45,0.08)]">
        <Link
          href="/vault"
          className="flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-white/80 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Vault
        </Link>
        <button
          onClick={() => {
            sessionStorage.clear();
            localStorage.removeItem('refreshToken');
            router.push('/login');
          }}
          className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-56 flex-shrink-0 glass-panel border-r border-[rgba(20,32,45,0.08)] rounded-none">
        <div className="w-full">
          <Sidebar />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-56 glass-panel">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(20,32,45,0.08)] md:hidden glass-panel rounded-none">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-white/60">
            <Menu size={20} className="text-slate-600" />
          </button>
          <p className="text-sm font-semibold text-slate-900">Admin Portal</p>
        </div>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
