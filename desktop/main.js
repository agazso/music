import { app, BrowserWindow, dialog, ipcMain, Menu, net } from 'electron';
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
// so QR codes and bookmarks stay valid across restarts; also the window frame choice
const save = (dataDir, st) => writeFileSync(path.join(dataDir, 'credentials.json'), JSON.stringify(st), { mode: 0o600 });
async function state(dataDir) {
  const file = path.join(dataDir, 'credentials.json');
  const st = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { username: 'admin', password: randomBytes(18).toString('base64url') };
  st.sharePassword ??= randomBytes(12).toString('base64url');
  st.frame ??= true; // the OS's own title bar and window buttons
  if (!st.port || !(await isFree(st.port))) st.port = await freePort();
  if (!st.webPort || !(await isFree(st.webPort))) st.webPort = await freePort();
  save(dataDir, st);
  return st;
}

function lanIp() {
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list) if (i.family === 'IPv4' && !i.internal) return i.address;
  return '127.0.0.1';
}

// serves the built frontend on the LAN so phones can open the share link; the window uses it too
const MIME = { '.html': 'text/html', '.webmanifest': 'application/manifest+json', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
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
  // macOS takes Cmd+Q and the Dock/app-switcher quit from the app menu; without one the app can't be quit and a
  // freshly installed version just re-activates the old process that is still running
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }]) : null);
  const dataDir = path.join(app.getPath('userData'), 'navidrome');
  mkdirSync(dataDir, { recursive: true });
  const music = await musicDir();
  if (!music) return;
  const st = await state(dataDir);
  const local = `http://127.0.0.1:${st.port}`;
  ipcMain.handle('lan-ip', () => lanIp()); // looked up when the share overlay opens, so a network change needs no restart

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

  const page = `http://127.0.0.1:${st.webPort}/`;
  // a frame can't be added to or removed from an open window, so the window is built anew for it
  async function open(bounds, maximized) {
    const desktop = {
      url: local, username: st.username, password: st.password, frame: st.frame,
      share: { webPort: st.webPort, port: st.port, password: st.sharePassword },
    };
    const win = new BrowserWindow({
      frame: st.frame, show: false, backgroundColor: '#000', ...bounds,
      webPreferences: { preload: path.join(here, 'preload.cjs'), additionalArguments: [`--desktop=${JSON.stringify(desktop)}`] },
    });
    win.webContents.on('before-input-event', (e, input) => { // Ctrl+Q quits, also without window chrome (Cmd+Q on macOS comes from the app menu)
      if (input.control && input.key.toLowerCase() === 'q') { e.preventDefault(); app.quit(); }
    });
    await win.loadURL(page);
    if (maximized) win.maximize();
    win.show();
    return win;
  }
  // the old window closes only once the new one shows, so the app never has no window (which would quit it)
  ipcMain.handle('set-frame', async (e, on) => {
    const old = BrowserWindow.fromWebContents(e.sender);
    st.frame = !!on; save(dataDir, st);
    await open(old.getNormalBounds(), old.isMaximized());
    old.destroy();
  });
  await waitFor(`${local}/rest/ping`);
  await open({}, true);
});

app.on('before-quit', () => { app.isQuitting = true; navidrome?.kill(); });
app.on('window-all-closed', () => app.quit());
