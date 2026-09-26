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
