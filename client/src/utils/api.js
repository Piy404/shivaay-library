import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  withCredentials: true,
});

let inMemoryCsrfToken = null;
let csrfPromise = null;

export async function ensureCsrfToken(forceRefresh = false) {
  if (inMemoryCsrfToken && !forceRefresh) {
    return inMemoryCsrfToken;
  }
  if (!csrfPromise || forceRefresh) {
    csrfPromise = api
      .get('/auth/csrf')
      .then((res) => {
        inMemoryCsrfToken = res.data.csrfToken;
        return inMemoryCsrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
}

export function clearCsrfToken() {
  inMemoryCsrfToken = null;
}

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

api.interceptors.request.use(
  async (config) => {
    const method = (config.method || 'get').toLowerCase();
    if (MUTATING_METHODS.has(method)) {
      const token = await ensureCsrfToken();
      config.headers['X-CSRF-Token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshInFlight = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Retry once with a fresh CSRF token if CSRF validation failed
    if (
      error.response?.status === 403 &&
      error.response?.data?.message?.toLowerCase().includes('csrf') &&
      !originalRequest._csrfRetried
    ) {
      originalRequest._csrfRetried = true;
      const freshToken = await ensureCsrfToken(true);
      originalRequest.headers['X-CSRF-Token'] = freshToken;
      return api(originalRequest);
    }

    // Attempt silent refresh on 401 except for auth endpoints themselves
    const url = originalRequest.url || '';
    const skipRefresh =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/2fa/verify-login');

    if (error.response?.status === 401 && !originalRequest._authRetried && !skipRefresh) {
      originalRequest._authRetried = true;
      try {
        if (!refreshInFlight) {
          refreshInFlight = api.post('/auth/refresh').finally(() => {
            refreshInFlight = null;
          });
        }
        await refreshInFlight;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
