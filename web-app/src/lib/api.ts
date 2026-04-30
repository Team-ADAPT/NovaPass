import axios from 'axios';

const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080');

const api = axios.create({
  baseURL: API_URL.endsWith('/api') || API_URL.endsWith('/api/') 
    ? (API_URL.endsWith('/') ? API_URL : `${API_URL}/`)
    : (API_URL.endsWith('/') ? `${API_URL}api/` : `${API_URL}/api/`),
  withCredentials: false,
  timeout: 10000,
});

// Attach access token from sessionStorage on every request
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${api.defaults.baseURL}auth/refresh`,
            { refreshToken }
          );
          sessionStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          sessionStorage.clear();
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  getSalt: (email: string) => api.get(`auth/salt?email=${encodeURIComponent(email)}`),
  register: (body: object) => api.post('auth/register', body),
  login: (body: object) => api.post('auth/login', body),
  logout: () => api.post('auth/logout'),
  setup2FA: () => api.post('auth/2fa/setup'),
  confirm2FA: (code: string) => api.post('auth/2fa/confirm', { code }),
  disable2FA: (code: string) => api.post('auth/2fa/disable', { code }),
};

export const passkeyApi = {
  beginRegistration: (passkeyName?: string) => 
    api.post('auth/passkey/register/begin', { passkeyName }),
  completeRegistration: (credential: object) => 
    api.post('auth/passkey/register/complete', credential),
  beginLogin: (email?: string) => 
    api.post('auth/passkey/login/begin', { email }),
  completeLogin: (credential: object) => 
    api.post('auth/passkey/login/complete', credential),
  list: () => api.get('auth/passkey'),
  delete: (passkeyId: number) => api.delete(`auth/passkey/${passkeyId}`),
  rename: (passkeyId: number, newName: string) => 
    api.put(`auth/passkey/${passkeyId}/name`, { passkeyId, newName }),
};

export const syncApi = {
  registerDevice: (body: { deviceId: string; deviceName: string; deviceType: string }) => 
    api.post('sync/devices/register', body),
  listDevices: () => api.get('sync/devices'),
  unregisterDevice: (deviceId: string) => api.post(`sync/devices/unregister/${deviceId}`),
  resolveConflict: (itemId: number, body: { resolution: string; encryptedData?: string }) => 
    api.post(`sync/conflicts/${itemId}/resolve`, body),
  getConflicts: () => api.get('sync/conflicts'),
  vaultSync: (body: { deviceId: string; lastSyncAt: string | null }) => 
    api.post('sync/vault', body),
};

export const vaultApi = {
  getAll: () => api.get('vault'),
  create: (body: object) => api.post('vault', body),
  update: (id: number, body: object) => api.put(`vault/${id}`, body),
  delete: (id: number) => api.delete(`vault/${id}`),
  sync: (lastSyncAt: string | null) => api.post('vault/sync', { lastSyncAt }),
};

// Admin API endpoints
export const adminApi = {
  // Dashboard stats
  getStats: () => api.get('admin/stats'),
  
  // User management
  listUsers: (page = 0, size = 20, search?: string) => 
    api.get('admin/users', { params: { page, size, search } }),
  getUserDetail: (userId: number) => api.get(`admin/users/${userId}`),
  updateUser: (userId: number, body: { active?: boolean; role?: string }) => 
    api.put(`admin/users/${userId}`, body),
  forceLogout: (userId: number) => api.post(`admin/users/${userId}/logout`),
  deleteUser: (userId: number) => api.delete(`admin/users/${userId}`),
  
  // Audit logs
  listAuditLogs: (page = 0, size = 50, userId?: number, action?: string) => 
    api.get('admin/audit', { params: { page, size, userId, action } }),
};

export default api;
