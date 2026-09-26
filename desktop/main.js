import { app, BrowserWindow, dialog, Menu, net, protocol } from 'electron';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const here = path.dirname(new URL(import.meta.url).pathname);
const dist = path.join(here, 'dist');
const navidromeBin = app.isPackaged ? path.join(process.resourcesPath, 'navidrome') : path.join(here, 'bin', 'navidrome');

// the frontend is served from app://bundle/ (file:// breaks Vite's module scripts)
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

const freePort = () => new Promise((resolve) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

// one admin account, generated on first run and kept in the app's data folder
function credentials(dataDir) {
  const file = path.join(dataDir, 'credentials.json');
  if (!existsSync(file)) writeFileSync(file, JSON.stringify({ username: 'admin', password: randomBytes(18).toString('base64url') }), { mode: 0o600 });
  return JSON.parse(readFileSync(file, 'utf8'));
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
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    return net.fetch(pathToFileURL(path.join(dist, pathname === '/' ? 'index.html' : pathname)).toString());
  });

  const dataDir = path.join(app.getPath('userData'), 'navidrome');
  mkdirSync(dataDir, { recursive: true });
  const music = await musicDir();
  if (!music) return;
  const port = await freePort();
  const creds = credentials(dataDir);
  const url = `http://127.0.0.1:${port}`;

  navidrome = spawn(navidromeBin, [], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ND_ADDRESS: '127.0.0.1', ND_PORT: String(port),
      ND_DATAFOLDER: dataDir, ND_CACHEFOLDER: path.join(dataDir, 'cache'), ND_MUSICFOLDER: music,
      ND_DEVAUTOCREATEADMINPASSWORD: creds.password, // only used on the very first run
      ND_ENABLEINSIGHTSCOLLECTOR: 'false', ND_SCANSCHEDULE: '1h', ND_LOGLEVEL: 'warn',
    },
  });
  navidrome.on('exit', (code) => { if (!app.isQuitting) { dialog.showErrorBox('Music', `Navidrome stopped (exit code ${code})`); app.quit(); } });

  const win = new BrowserWindow({
    frame: false, show: false, backgroundColor: '#000',
    webPreferences: { preload: path.join(here, 'preload.cjs'), additionalArguments: [`--desktop=${JSON.stringify({ url, ...creds })}`] },
  });
  win.webContents.on('before-input-event', (e, input) => { // Ctrl+Q quits; there is no window chrome
    if (input.control && input.key.toLowerCase() === 'q') { e.preventDefault(); app.quit(); }
  });
  await waitFor(`${url}/rest/ping`);
  await win.loadURL('app://bundle/');
  win.maximize();
  win.show();
});

app.on('before-quit', () => { app.isQuitting = true; navidrome?.kill(); });
app.on('window-all-closed', () => app.quit());
