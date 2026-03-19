'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  LogOut, 
  Shield,
  ChevronLeft
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is admin from JWT token
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role === 'ADMIN') {
        setIsAdmin(true);
        setError('');
      } else {
        setError('Access denied: Admin privileges required');
        setTimeout(() => router.push('/vault'), 2000);
      }
    } catch (err) {
      setError('Invalid authentication token');
      setTimeout(() => router.push('/login'), 2000);
    } finally {
      setLoading(false);
    }
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-md text-center">
          <Shield className="w-12 h-12 mx-auto mb-4" />
          <p className="font-semibold mb-2">Access Denied</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/audit', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-lg text-gray-900 dark:text-white">NovaPass</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Link
            href="/vault"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full"
          >
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Back to Vault</span>
          </Link>
          <button
            onClick={() => {
              sessionStorage.clear();
              localStorage.removeItem('refreshToken');
              router.push('/login');
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
