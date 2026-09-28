// injected by the Electron preload (desktop/preload.cjs)
interface Window {
  desktop?: {
    url: string; username: string; password: string;
    // ports and the share account's password for the QR code; the LAN address is looked up on demand
    share?: { webPort: number; port: number; password: string };
    lanIp: () => Promise<string>;
  };
}

// the dev machine's LAN address, from vite.config.ts
declare const __LAN_IP__: string;
