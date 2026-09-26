import { app, BrowserWindow, dialog, Menu, net } from 'electron';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const dist = path.join(here, 'dist');
const navidromeBin = app.isPackaged ? path.join(process.resourcesPath, 'navidrome') : path.join(here, 'bin', 'navidrome');

const isFree = (port) => new Promise((resolve) => {
  const s = createServer();
  s.once('error', () => resolve(false));
  s.listen(port, '0.0.0.0', () => s.close(() => resolve(true)));
});
const freePort = () => new Promise((resolve) => {
  const s = createServer();
  s.listen(0, '0.0.0.0', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

// generated on first run and kept in the app's data folder: admin + share passwords and the two ports,
// so QR codes and bookmarks stay valid across restarts
async function state(dataDir) {
  const file = path.join(dataDir, 'credentials.json');
  const st = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { username: 'admin', password: randomBytes(18).toString('base64url') };
  st.sharePassword ??= randomBytes(12).toString('base64url');
  if (!st.port || !(await isFree(st.port))) st.port = await freePort();
  if (!st.webPort || !(await isFree(st.webPort))) st.webPort = await freePort();
  writeFileSync(file, JSON.stringify(st), { mode: 0o600 });
  return st;
}

function lanIp() {
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list) if (i.family === 'IPv4' && !i.internal) return i.address;
  return '127.0.0.1';
}

// serves the built frontend on the LAN so phones can open the share link; the window uses it too
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
function serveFrontend(port) {
  http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(dist, p === '/' ? 'index.html' : p);
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(dist, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  }).listen(port, '0.0.0.0');
}

async function musicDir() {
  const dir = app.getPath('music');
  if (existsSync(dir)) return dir;
  const r = await dialog.showOpenDialog({ title: 'Choose your music folder', properties: ['openDirectory'] });
  if (r.canceled) { app.quit(); return null; }
  return r.filePaths[0];
}

async function waitFor(url) {
  for (let i = 0; i < 240; i++) {
    try { if ((await net.fetch(url)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('navidrome did not start');
}

let navidrome;

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  const dataDir = path.join(app.getPath('userData'), 'navidrome');
  mkdirSync(dataDir, { recursive: true });
  const music = await musicDir();
  if (!music) return;
  const st = await state(dataDir);
  const local = `http://127.0.0.1:${st.port}`, ip = lanIp();

  navidrome = spawn(navidromeBin, [], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ND_ADDRESS: '0.0.0.0', ND_PORT: String(st.port), // on the LAN so shared phones can stream
      ND_DATAFOLDER: dataDir, ND_CACHEFOLDER: path.join(dataDir, 'cache'), ND_MUSICFOLDER: music,
      ND_DEVAUTOCREATEADMINPASSWORD: st.password, // only used on the very first run
      ND_ENABLEINSIGHTSCOLLECTOR: 'false', ND_SCANSCHEDULE: '1h', ND_LOGLEVEL: 'warn',
    },
  });
  navidrome.on('exit', (code) => { if (!app.isQuitting) { dialog.showErrorBox('Music', `Navidrome stopped (exit code ${code})`); app.quit(); } });
  serveFrontend(st.webPort);

  const desktop = {
    url: local, username: st.username, password: st.password,
    share: { url: `http://${ip}:${st.webPort}/`, server: `http://${ip}:${st.port}`, password: st.sharePassword },
  };
  const win = new BrowserWindow({
    frame: false, show: false, backgroundColor: '#000',
    webPreferences: { preload: path.join(here, 'preload.cjs'), additionalArguments: [`--desktop=${JSON.stringify(desktop)}`] },
  });
  win.webContents.on('before-input-event', (e, input) => { // Ctrl+Q quits; there is no window chrome
    if (input.control && input.key.toLowerCase() === 'q') { e.preventDefault(); app.quit(); }
  });
  await waitFor(`${local}/rest/ping`);
  await win.loadURL(`http://127.0.0.1:${st.webPort}/`);
  win.maximize();
  win.show();
});

app.on('before-quit', () => { app.isQuitting = true; navidrome?.kill(); });
app.on('window-all-closed', () => app.quit());
