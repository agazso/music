# Music desktop app

Electron shell that runs a bundled Navidrome in the background and shows the frontend in a
maximized, frameless window. Nothing to configure: on first start it creates an admin account with a
random password, points Navidrome at the user's Music folder (asks for one if it does not exist) and logs
the frontend in silently. Navidrome listens on 127.0.0.1 on a free port and is not reachable from the network.

    pnpm install            # Electron + electron-builder
    pnpm fetch              # downloads the navidrome linux amd64 binary into bin/
    pnpm build:frontend     # builds ../frontend into dist/
    pnpm dev                # runs the app from source
    pnpm dist               # all of the above, then AppImage and .deb into release/

Data lives in the app's user-data folder (`~/.config/Music/navidrome` on Linux): the database, cache and
`credentials.json`. Delete that folder for a factory reset. `Ctrl+Q` quits.

Linux x86_64 only for now; other platforms need their own navidrome binary in `fetch-navidrome.mjs` and
matching `build` targets in `package.json`.

## macOS

Built on a GitHub Actions Apple Silicon runner by `.github/workflows/mac.yml` (run it manually from the
Actions tab, or push a `v*` tag). It produces an unsigned, ad-hoc-signed `Music-<version>-arm64.dmg`
as a workflow artifact. On a Mac with the tooling installed, `pnpm dist:mac` does the same locally.
Intel Macs need `--x64` and the `darwin_amd64` navidrome binary (`ND_ARCH=amd64 pnpm fetch`).

Opening an unsigned app, once per install, no admin tricks needed:

- **macOS 14 and earlier:** right-click `Music.app`, choose *Open*, confirm.
- **macOS 15 Sequoia:** double-click, dismiss the "Apple could not verify" dialog, open
  *System Settings → Privacy & Security*, scroll down to the note about Music being blocked, click
  *Open Anyway*, confirm with your password.

Signing and notarization need an Apple Developer account ($99/year); with a Developer ID certificate and an
App Store Connect API key added as repository secrets, electron-builder handles both in the same workflow
and the steps above go away.
