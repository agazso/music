import { session } from './api.svelte';

const USER = 'share';

// Builds the link a phone can open: frontend URL + account in the fragment. Needs an admin login,
// because it creates (or re-keys) the non-admin 'share' user. Navidrome has no Subsonic endpoints for
// user management, so this goes through its native REST API with a JWT from /auth/login.
// The password is stable per device: the desktop app stores it, the web app keeps it in localStorage.
export async function shareLink() {
  const api = session.api!, base = session.base;
  const d = window.desktop?.share;
  let password = d?.password ?? localStorage.getItem('share.password');
  const fresh = !password;
  if (!password) password = crypto.randomUUID().replace(/-/g, '');

  const { token } = (await api.navidromeSession()) as { token: string };
  const headers = { 'x-nd-authorization': `Bearer ${token}`, 'content-type': 'application/json' };
  const nd = async (path: string, init?: RequestInit) => {
    const r = await fetch(`${base}/api${path}`, { ...init, headers });
    if (!r.ok) throw new Error(`Navidrome ${r.status} on ${path}`);
    return r.status === 204 ? null : r.json();
  };
  const users = (await nd('/user')) as { id: string; userName: string }[];
  const existing = users.find((u) => u.userName === USER);
  if (!existing) await nd('/user', { method: 'POST', body: JSON.stringify({ userName: USER, name: 'Share', password, isAdmin: false }) });
  else if (fresh || d) await nd(`/user/${existing.id}`, { method: 'PUT', body: JSON.stringify({ ...existing, password }) });
  localStorage.setItem('share.password', password);

  const page = d?.url ?? location.origin + location.pathname;
  const server = d?.server ?? base;
  return `${page}#u=${USER}&p=${encodeURIComponent(password)}&s=${encodeURIComponent(server)}`;
}
