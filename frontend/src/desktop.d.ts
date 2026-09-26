// injected by the Electron preload (desktop/preload.cjs)
interface Window {
  desktop?: {
    url: string; username: string; password: string;
    // LAN addresses and the share account's password, for the QR code
    share?: { url: string; server: string; password: string };
  };
}
