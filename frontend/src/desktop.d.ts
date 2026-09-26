// injected by the Electron preload (desktop/preload.cjs)
interface Window { desktop?: { url: string; username: string; password: string } }
