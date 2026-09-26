import { SubsonicAPI } from 'subsonic-api';

type Creds = { url: string; username: string; password: string };

export const session = $state<{ api: SubsonicAPI | null; base: string; authQs: string; username: string; admin: boolean }>({
  api: null, base: '', authQs: '', username: '', admin: false,
});

// subsonic-api resolves failed responses instead of throwing
export function ok<T extends { status: string }>(r: T): T {
  if (r.status === 'failed') throw new Error((r as { error?: { message: string } }).error?.message ?? 'request failed');
  return r;
}

export async function login(c: Creds) {
  const base = c.url.replace(/\/+$/, '');
  const api = new SubsonicAPI({ url: base, auth: { username: c.username, password: c.password }, reuseSalt: true });
  const r = await api.ping(); // the library resolves failures, so check status ourselves
  if (r.status === 'failed') throw new Error(r.error.message);
  // ponytail: capture the token/salt query once so cover and stream URLs can be built synchronously
  const u = new URL(await api.getCoverArtURL({ id: '-' }));
  u.searchParams.delete('id');
  session.api = api; session.base = base; session.authQs = u.searchParams.toString(); session.username = c.username;
  session.admin = ok(await api.getUser({ username: c.username })).user.adminRole;
  localStorage.setItem('creds', JSON.stringify(c));
}

export function logout() { localStorage.removeItem('creds'); session.api = null; }

export function restore() {
  // a share link carries the account in the fragment: #u=share&p=...&s=http://server
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('u') && h.get('p') && h.get('s')) {
    history.replaceState(null, '', location.pathname);
    return login({ url: h.get('s')!, username: h.get('u')!, password: h.get('p')! }).catch(logout);
  }
  // the desktop app injects its local server and account; otherwise use what the user typed last time
  const raw = window.desktop ? JSON.stringify(window.desktop) : localStorage.getItem('creds');
  return raw ? login(JSON.parse(raw)).catch(logout) : Promise.resolve();
}

export const coverUrl = (id: string | undefined, size = 300) =>
  id ? `${session.base}/rest/getCoverArt?id=${encodeURIComponent(id)}&size=${size}&${session.authQs}` : '';

export const streamUrl = (id: string) =>
  `${session.base}/rest/stream?id=${encodeURIComponent(id)}&${session.authQs}`;
