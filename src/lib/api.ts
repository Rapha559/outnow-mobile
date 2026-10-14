import { publishSocialMutation } from '@/lib/social-sync';

export const API_BASE = 'https://www.outnowtickets.com';

const inFlightCheckoutRequests = new Map<string, Promise<unknown>>();

async function performRequest<T>(
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

  if (path === '/api/mobile/social/discovery' && String(options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : null;
      if (body?.action === 'like' && body.eventId && typeof data?.liked === 'boolean') {
        publishSocialMutation({ type: 'like', eventId: String(body.eventId), liked: data.liked, likeCount: Number(data.likeCount || 0) });
      }
      if (body?.action === 'follow' && body.promoterId && typeof data?.following === 'boolean') {
        publishSocialMutation({ type: 'follow', promoterId: String(body.promoterId), following: data.following, followers: Number(data.followers || 0) });
      }
    } catch {}
  }

  return data as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  sessionToken?: string | null,
): Promise<T> {
  const method = String(options.method || 'GET').toUpperCase();

  if (path === '/api/mobile/checkout' && method === 'POST') {
    const bodyText = typeof options.body === 'string' ? options.body : '';
    const key = `${sessionToken || 'anonymous'}:${bodyText}`;
    const existing = inFlightCheckoutRequests.get(key);
    if (existing) return existing as Promise<T>;

    const request = (async () => {
      let checkoutBody: { waitlistOfferToken?: unknown } | null = null;
      try {
        checkoutBody = bodyText ? JSON.parse(bodyText) : null;
      } catch {}

      // Normal purchases are quoted against the server immediately before an
      // order is created. Waitlist offers are intentionally exempt because a
      // valid offer can reserve a ticket even when normal inventory is sold out.
      if (!checkoutBody?.waitlistOfferToken) {
        await performRequest('/api/mobile/checkout/preview', options, sessionToken);
      }
      return performRequest<T>(path, options, sessionToken);
    })();

    inFlightCheckoutRequests.set(key, request);
    try {
      return await request;
    } finally {
      inFlightCheckoutRequests.delete(key);
    }
  }

  return performRequest<T>(path, options, sessionToken);
}
