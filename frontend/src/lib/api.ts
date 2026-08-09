const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) }, ...options });
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message ?? `API request failed (${res.status})`); }
  return res.json() as Promise<T>;
}
export const api = {
  health: () => request<{ok:boolean; network:string}>('/health'),
  agents: () => request<{items: import('../types/domain').Agent[]}>('/agents'),
  policies: () => request<{items: import('../types/domain').Policy[]}>('/policies'),
  escrows: () => request<{items: import('../types/domain').Escrow[]}>('/escrows'),
  activity: () => request<{items: import('../types/domain').Activity[]}>('/transactions')
};
