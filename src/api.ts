/* Calls to our own Worker. The browser never talks to Loyverse directly. */
import type { ApiError, Menu, NewOrderInput, PlacedOrder } from '../shared/types';

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data as ApiError;
    throw new ApiRequestError(e.error || `${res.status} ${res.statusText}`, res.status, e.code);
  }
  return data as T;
}

export const api = {
  menu: (refresh = false) => req<Menu>(refresh ? '/api/menu?refresh=1' : '/api/menu'),
  place: (input: NewOrderInput) => req<PlacedOrder>('/api/orders', { method: 'POST', body: JSON.stringify(input) }),
};
