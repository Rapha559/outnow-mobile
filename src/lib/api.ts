export const API_BASE = 'https://www.outnowtickets.com';

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  sessionToken?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('accept', 'application/json');

  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  if (sessionToken) {
    headers.set('authorization', `Bearer ${sessionToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Something went wrong. Please try again.');
  }

  return data as T;
}
