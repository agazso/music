# Music desktop app

Electron shell that runs a bundled Navidrome in the background and shows the frontend in a
maximized window with the OS's native frame (switchable to frameless under Settings → Appearance; the
window is rebuilt, since a frame can't be added to an open one). Nothing to configure: on first start it creates an admin account with a
random password, points Navidrome at the user's Music folder (asks for one if it does not exist) and logs
the frontend in silently. Navidrome and a small static server for the frontend listen on all interfaces so
phones on the LAN can open the share QR code; the only protection is the share account's password. Ports are
chosen on first run and reused, so QR codes and bookmarks stay valid across restarts.

    pnpm install            # Electron + electron-builder
    pnpm navidrome          # downloads the navidrome binary for this platform into bin/
    pnpm build:frontend     # builds ../frontend into dist/
    pnpm dev                # runs the app from source
    pnpm dist               # all of the above, then AppImage and .deb into release/

Data lives in the app's user-data folder (`~/.config/Music/navidrome` on Linux): the database, cache and
`credentials.json` (admin and share passwords, ports, the window frame choice). On macOS the folder is
`~/Library/Application Support/Music/navidrome`. Delete that folder for a factory reset. `Ctrl+Q` (`Cmd+Q` on macOS) quits.

Builds exist for Linux x86_64 and macOS on Apple Silicon. Other platforms need their navidrome binary
(`ND_OS` / `ND_ARCH` for `fetch-navidrome.mjs`) and matching `build` targets in `package.json`.

## macOS

Built on a GitHub Actions Apple Silicon runner by `.github/workflows/desktop.yml`, which also builds the Linux
AppImage and deb and publishes a release on a `v*` tag (run it manually from the
Actions tab, or push a `v*` tag). It produces an ad-hoc-signed, non-notarized `Music-<version>-arm64.dmg` and
zip, attached to the release on a tag and kept as workflow artifacts. On a Mac with the tooling installed, `pnpm dist:mac` does the same locally.
Intel Macs need `--x64` and the `darwin_amd64` navidrome binary (`ND_ARCH=amd64 pnpm navidrome`).

Opening the non-notarized app the first time, the "damaged" message and updating are covered for users in
the [root README](../README.md#opening-the-app-the-first-time). Builds before 0.1.1 had no app menu, so
`Cmd+Q` did nothing; quit those from the Dock or Activity Monitor.

Signing and notarization need an Apple Developer account ($99/year); with a Developer ID certificate and an
App Store Connect API key added as repository secrets, electron-builder handles both in the same workflow
and that workaround goes away.
