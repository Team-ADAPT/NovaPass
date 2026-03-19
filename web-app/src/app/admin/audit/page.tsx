'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LogIn,
  LogOut,
  UserPlus,
  Key,
  Shield,
  Trash2,
  Edit,
  Fingerprint
} from 'lucide-react';

interface AuditLogEntry {
  id: number;
  userId: number | null;
  userEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  LOGIN: <LogIn className="w-4 h-4" />,
  LOGOUT: <LogOut className="w-4 h-4" />,
  REGISTER: <UserPlus className="w-4 h-4" />,
  VAULT_CREATE: <Key className="w-4 h-4" />,
  VAULT_UPDATE: <Edit className="w-4 h-4" />,
  VAULT_DELETE: <Trash2 className="w-4 h-4" />,
  TWO_FACTOR_ENABLE: <Shield className="w-4 h-4" />,
  TWO_FACTOR_DISABLE: <Shield className="w-4 h-4" />,
  PASSKEY_REGISTER: <Fingerprint className="w-4 h-4" />,
  PASSKEY_DELETE: <Fingerprint className="w-4 h-4" />,
  ADMIN_UPDATE_USER: <Edit className="w-4 h-4" />,
  ADMIN_DELETE_USER: <Trash2 className="w-4 h-4" />,
  ADMIN_FORCE_LOGOUT: <LogOut className="w-4 h-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
  LOGOUT: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20',
  REGISTER: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  VAULT_CREATE: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20',
  VAULT_UPDATE: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  VAULT_DELETE: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  TWO_FACTOR_ENABLE: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20',
  TWO_FACTOR_DISABLE: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  PASSKEY_REGISTER: 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  PASSKEY_DELETE: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  ADMIN_UPDATE_USER: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20',
  ADMIN_DELETE_USER: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  ADMIN_FORCE_LOGOUT: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
};

const AVAILABLE_ACTIONS = [
  'LOGIN', 'LOGOUT', 'REGISTER',
  'VAULT_CREATE', 'VAULT_UPDATE', 'VAULT_DELETE',
  'TWO_FACTOR_ENABLE', 'TWO_FACTOR_DISABLE',
  'PASSKEY_REGISTER', 'PASSKEY_DELETE',
  'ADMIN_UPDATE_USER', 'ADMIN_DELETE_USER', 'ADMIN_FORCE_LOGOUT'
];

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.listAuditLogs(
        page, 
        50, 
        undefined, 
        actionFilter || undefined
      );
      const response = data as AuditLogResponse;
      setLogs(response.logs);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, loadLogs]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {totalElements} total events
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          {actionFilter && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">
              1
            </span>
          )}
        </button>
        
        {showFilters && (
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Action Type
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(0);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Actions</option>
                  {AVAILABLE_ACTIONS.map(action => (
                    <option key={action} value={action}>
                      {formatAction(action)}
                    </option>
                  ))}
                </select>
              </div>
              {actionFilter && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setActionFilter('');
                      setPage(0);
                    }}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${
                        ACTION_COLORS[log.action] || 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20'
                      }`}>
                        {ACTION_ICONS[log.action] || null}
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.userEmail ? (
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{log.userEmail}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ID: {log.userId}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {log.resourceType ? (
                        <span>
                          {log.resourceType}
                          {log.resourceId && ` #${log.resourceId}`}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
