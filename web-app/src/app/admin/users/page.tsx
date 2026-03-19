'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { 
  Search, 
  MoreVertical, 
  Shield, 
  ShieldOff,
  LogOut,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Key,
  Fingerprint
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

interface UserListResponse {
  users: UserSummary[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.listUsers(page, 20, search || undefined);
      const response = data as UserListResponse;
      setUsers(response.users);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [page, search, loadUsers]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only close if clicking outside the action menu
      if (!target.closest('[data-action-menu]')) {
        setActionMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    // loadUsers will be triggered by the useEffect when page changes
  };

  const toggleActive = async (user: UserSummary) => {
    if (actionLoading) return; // Prevent concurrent actions
    setActionLoading(user.id);
    setActionMenu(null);
    try {
      await adminApi.updateUser(user.id, { active: !user.active });
      await loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const forceLogout = async (user: UserSummary) => {
    if (actionLoading) return;
    if (!confirm(`Force logout user ${user.email}?`)) return;
    setActionLoading(user.id);
    setActionMenu(null);
    try {
      await adminApi.forceLogout(user.id);
      alert('User logged out successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to logout user');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (user: UserSummary) => {
    if (actionLoading) return;
    if (!confirm(`Delete user ${user.email}? This action cannot be undone.`)) return;
    setActionLoading(user.id);
    setActionMenu(null);
    try {
      await adminApi.deleteUser(user.id);
      await loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleRole = async (user: UserSummary) => {
    if (actionLoading) return;
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Change ${user.email} role to ${newRole}?`)) return;
    setActionLoading(user.id);
    setActionMenu(null);
    try {
      await adminApi.updateUser(user.id, { role: newRole });
      await loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {totalElements} total users
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email or username..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </form>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Security
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.active 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}>
                          {user.active ? 'Active' : 'Disabled'}
                        </span>
                        {user.role === 'ADMIN' && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {user.twoFactorEnabled && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                            <Shield className="w-3 h-3" /> 2FA
                          </span>
                        )}
                        {user.passkeyCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-400">
                            <Fingerprint className="w-3 h-3" /> {user.passkeyCount}
                          </span>
                        )}
                        {!user.twoFactorEnabled && user.passkeyCount === 0 && (
                          <span className="text-gray-400 text-sm">Basic</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Key className="w-4 h-4" />
                        <span>{user.vaultItemCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(user.lastLogin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative" data-action-menu>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenu(actionMenu === user.id ? null : user.id);
                          }}
                          disabled={actionLoading === user.id}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          aria-label="User actions"
                          aria-haspopup="true"
                          aria-expanded={actionMenu === user.id}
                        >
                          {actionLoading === user.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" role="status" aria-label="Loading"></div>
                          ) : (
                            <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                        
                        {actionMenu === user.id && (
                          <div 
                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10"
                            onClick={e => e.stopPropagation()}
                            role="menu"
                          >
                            <button
                              onClick={() => toggleActive(user)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {user.active ? (
                                <>
                                  <ShieldOff className="w-4 h-4" /> Disable Account
                                </>
                              ) : (
                                <>
                                  <Shield className="w-4 h-4" /> Enable Account
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => toggleRole(user)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                            </button>
                            <button
                              onClick={() => forceLogout(user)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <LogOut className="w-4 h-4" /> Force Logout
                            </button>
                            <hr className="my-1 border-gray-200 dark:border-gray-700" />
                            <button
                              onClick={() => deleteUser(user)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" /> Delete User
                            </button>
                          </div>
                        )}
                      </div>
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
