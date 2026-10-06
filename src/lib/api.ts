export type UserRole = 'ADMIN' | 'USER';

export interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface CoaRecord {
  id: number;
  code: string;
  name: string;
  category: string | null;
  department: string;
  source: string;
  is_active: boolean;
  is_gl_derived: boolean;
  created_at: string;
}

export interface UploadBatch {
  id: number;
  kind: 'BUDGET' | 'GL';
  filename: string;
  fiscal_year: number;
  period: number | null;
  period_label: string;
  uploaded_by: string;
  uploaded_at: string;
  rows_read: number;
  rows_imported: number;
  rows_rejected: number;
  total_amount: string;
  status: 'ACTIVE' | 'REPLACED' | 'CANCELLED';
  replaced_batch_id: number | null;
}

export interface ApiResult<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Array<{ row?: number | null; issue: string; expected?: string }>;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const TOKEN_KEY = 'vega.access_token';

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const api = {
  getToken: storedToken,

  setToken(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      throw new ApiError('Browser storage is unavailable; sign-in cannot be retained.', 0);
    }
  },

  async request<T>(path: string, init: RequestInit = {}, options: { public?: boolean } = {}): Promise<ApiResult<T>> {
    const headers = new Headers(init.headers);
    const token = storedToken();
    if (!options.public && token) headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');

    let response: Response;
    try {
      response = await fetch(`/api/v1${path}`, { ...init, headers });
    } catch {
      throw new ApiError('Tidak dapat terhubung ke server VEGA.', 0);
    }
    const result = await response.json().catch(() => null) as ApiResult<T> | { detail?: string; message?: string } | null;
    if (!response.ok) {
      const detail = result && 'message' in result ? result.message : result && 'detail' in result ? result.detail : undefined;
      if (response.status === 401 && !options.public) {
        api.setToken(null);
        window.dispatchEvent(new Event('vega:session-expired'));
      }
      const validation = result && 'errors' in result ? result.errors?.map(item => item.issue).filter(Boolean).join(' ') : '';
      throw new ApiError(response.status === 422 && validation ? validation : detail || `Permintaan gagal (HTTP ${response.status}).`, response.status);
    }
    if (!result || !('success' in result)) throw new ApiError('Respons server tidak valid.', response.status);
    return result as ApiResult<T>;
  },

  async login(username: string, password: string) {
    const result = await api.request<{ access_token: string; token_type: string; user: UserProfile }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) },
      { public: true },
    );
    if (!result.success) throw new ApiError(result.message || 'Login gagal.', 401);
    api.setToken(result.data.access_token);
    return result.data.user;
  },

  async me() {
    const result = await api.request<UserProfile>('/auth/me');
    return result.data;
  },

  async logout() {
    try {
      await api.request<Record<string, never>>('/auth/logout', { method: 'POST' });
    } finally {
      api.setToken(null);
    }
  },
};
