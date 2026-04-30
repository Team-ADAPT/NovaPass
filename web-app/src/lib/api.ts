import axios from 'axios';

const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080');

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
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
            `${API_URL}/api/auth/refresh`,
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
  getSalt: (email: string) => api.get(`/api/auth/salt?email=${encodeURIComponent(email)}`),
  register: (body: object) => api.post('/api/auth/register', body),
  login: (body: object) => api.post('/api/auth/login', body),
  logout: () => api.post('/api/auth/logout'),
  setup2FA: () => api.post('/api/auth/2fa/setup'),
  confirm2FA: (code: string) => api.post('/api/auth/2fa/confirm', { code }),
  disable2FA: (code: string) => api.post('/api/auth/2fa/disable', { code }),
};

export const passkeyApi = {
  beginRegistration: (passkeyName?: string) => 
    api.post('/api/auth/passkey/register/begin', { passkeyName }),
  completeRegistration: (credential: object) => 
    api.post('/api/auth/passkey/register/complete', credential),
  beginLogin: (email?: string) => 
    api.post('/api/auth/passkey/login/begin', { email }),
  completeLogin: (credential: object) => 
    api.post('/api/auth/passkey/login/complete', credential),
  list: () => api.get('/api/auth/passkey'),
  delete: (passkeyId: number) => api.delete(`/api/auth/passkey/${passkeyId}`),
  rename: (passkeyId: number, newName: string) => 
    api.put(`/api/auth/passkey/${passkeyId}/name`, { passkeyId, newName }),
};

export const syncApi = {
  registerDevice: (body: { deviceId: string; deviceName: string; deviceType: string }) => 
    api.post('/api/sync/devices/register', body),
  listDevices: () => api.get('/api/sync/devices'),
  unregisterDevice: (deviceId: string) => api.post(`/api/sync/devices/unregister/${deviceId}`),
  resolveConflict: (itemId: number, body: { resolution: string; encryptedData?: string }) => 
    api.post(`/api/sync/conflicts/${itemId}/resolve`, body),
  getConflicts: () => api.get('/api/sync/conflicts'),
  vaultSync: (body: { deviceId: string; lastSyncAt: string | null }) => 
    api.post('/api/sync/vault', body),
};

export const vaultApi = {
  getAll: () => api.get('/api/vault'),
  create: (body: object) => api.post('/api/vault', body),
  update: (id: number, body: object) => api.put(`/api/vault/${id}`, body),
  delete: (id: number) => api.delete(`/api/vault/${id}`),
  sync: (lastSyncAt: string | null) => api.post('/api/vault/sync', { lastSyncAt }),
};

// Admin API endpoints
export const adminApi = {
  // Dashboard stats
  getStats: () => api.get('/api/admin/stats'),
  
  // User management
  listUsers: (page = 0, size = 20, search?: string) => 
    api.get('/api/admin/users', { params: { page, size, search } }),
  getUserDetail: (userId: number) => api.get(`/api/admin/users/${userId}`),
  updateUser: (userId: number, body: { active?: boolean; role?: string }) => 
    api.put(`/api/admin/users/${userId}`, body),
  forceLogout: (userId: number) => api.post(`/api/admin/users/${userId}/logout`),
  deleteUser: (userId: number) => api.delete(`/api/admin/users/${userId}`),
  
  // Audit logs
  listAuditLogs: (page = 0, size = 50, userId?: number, action?: string) => 
    api.get('/api/admin/audit', { params: { page, size, userId, action } }),
};

export default api;
