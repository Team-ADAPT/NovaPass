'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { 
  Users, 
  Key, 
  Shield, 
  Activity,
  UserCheck,
  Fingerprint,
  LogIn,
  UserPlus
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      label: 'Total Users', 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      color: 'blue',
      description: 'Registered accounts'
    },
    { 
      label: 'Active Users', 
      value: stats?.activeUsers || 0, 
      icon: UserCheck, 
      color: 'green',
      description: 'Enabled accounts'
    },
    { 
      label: '2FA Enabled', 
      value: stats?.usersWithTwoFactor || 0, 
      icon: Shield, 
      color: 'purple',
      description: 'Users with two-factor auth'
    },
    { 
      label: 'Vault Items', 
      value: stats?.totalVaultItems || 0, 
      icon: Key, 
      color: 'amber',
      description: 'Total stored credentials'
    },
    { 
      label: 'Passkeys', 
      value: stats?.totalPasskeys || 0, 
      icon: Fingerprint, 
      color: 'pink',
      description: 'WebAuthn credentials'
    },
    { 
      label: 'Logins Today', 
      value: stats?.loginsToday || 0, 
      icon: LogIn, 
      color: 'cyan',
      description: 'Successful logins today'
    },
    { 
      label: 'New Users Today', 
      value: stats?.registrationsToday || 0, 
      icon: UserPlus, 
      color: 'emerald',
      description: 'Registrations today'
    },
    { 
      label: 'Security Score', 
      value: stats?.totalUsers ? Math.round((stats.usersWithTwoFactor / stats.totalUsers) * 100) : 0, 
      icon: Activity, 
      color: 'indigo',
      description: '% users with 2FA',
      suffix: '%'
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          System overview and statistics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value.toLocaleString()}{stat.suffix || ''}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {stat.description}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Login Activity (Last 30 Days)
          </h3>
          <div className="h-48 flex items-end gap-1">
            {(stats?.dailyLogins || []).slice(-14).map((point) => (
              <div
                key={point.date}
                className="flex-1 bg-blue-500 dark:bg-blue-600 rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-500"
                style={{ 
                  height: `${Math.max(4, (point.count / Math.max(...(stats?.dailyLogins || []).map(d => d.count), 1)) * 100)}%` 
                }}
                title={`${point.date}: ${point.count} logins`}
                role="img"
                aria-label={`${point.date}: ${point.count} logins`}
              />
            ))}
            {(!stats?.dailyLogins || stats.dailyLogins.length === 0) && (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Registration Activity (Last 30 Days)
          </h3>
          <div className="h-48 flex items-end gap-1">
            {(stats?.dailyRegistrations || []).slice(-14).map((point) => (
              <div
                key={point.date}
                className="flex-1 bg-green-500 dark:bg-green-600 rounded-t transition-all hover:bg-green-600 dark:hover:bg-green-500"
                style={{ 
                  height: `${Math.max(4, (point.count / Math.max(...(stats?.dailyRegistrations || []).map(d => d.count), 1)) * 100)}%` 
                }}
                title={`${point.date}: ${point.count} registrations`}
                role="img"
                aria-label={`${point.date}: ${point.count} registrations`}
              />
            ))}
            {(!stats?.dailyRegistrations || stats.dailyRegistrations.length === 0) && (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/users"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Manage Users
          </a>
          <a
            href="/admin/audit"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            View Audit Logs
          </a>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            Refresh Stats
          </button>
        </div>
      </div>
    </div>
  );
}
