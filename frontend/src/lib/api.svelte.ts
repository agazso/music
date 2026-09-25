import { SubsonicAPI } from 'subsonic-api';

type Creds = { url: string; username: string; password: string };

export const session = $state<{ api: SubsonicAPI | null; base: string; authQs: string }>({
  api: null, base: '', authQs: '',
});

export async function login(c: Creds) {
  const base = c.url.replace(/\/+$/, '');
  const api = new SubsonicAPI({ url: base, auth: { username: c.username, password: c.password }, reuseSalt: true });
  const r = await api.ping(); // the library resolves failures, so check status ourselves
  if (r.status === 'failed') throw new Error(r.error.message);
  // ponytail: capture the token/salt query once so cover and stream URLs can be built synchronously
  const u = new URL(await api.getCoverArtURL({ id: '-' }));
  u.searchParams.delete('id');
  session.api = api; session.base = base; session.authQs = u.searchParams.toString();
  localStorage.setItem('creds', JSON.stringify(c));
}

export function logout() { localStorage.removeItem('creds'); session.api = null; }

export function restore() {
  const raw = localStorage.getItem('creds');
  return raw ? login(JSON.parse(raw)).catch(logout) : Promise.resolve();
}

export const coverUrl = (id: string | undefined, size = 300) =>
  id ? `${session.base}/rest/getCoverArt?id=${encodeURIComponent(id)}&size=${size}&${session.authQs}` : '';

export const streamUrl = (id: string) =>
  `${session.base}/rest/stream?id=${encodeURIComponent(id)}&${session.authQs}`;
