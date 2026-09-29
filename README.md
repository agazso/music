# Music

A music player for the collection you already have on your computer. Your albums show up as a wall of covers:
click one to play it, or let the app pick for you. Phones on the same Wi-Fi can join in by scanning a QR code
and play from your library too.

Nothing to set up. The app reads the music in your system's Music folder and keeps its index up to date on its
own. Under the hood it runs [Navidrome](https://www.navidrome.org/), a music server, which the app starts and
stops for you.

## Install

Download the file for your computer from the [latest release](https://github.com/agazso/music/releases/latest).

| Computer | File |
|---|---|
| Mac with Apple Silicon (M1 or later) | `Music-<version>-arm64.dmg` |
| Linux, 64-bit PC | `Music-<version>.AppImage` or `music-desktop_<version>_amd64.deb` |

Windows and Intel Macs are not supported yet.

### macOS

1. Open the `.dmg` and drag **Music** onto **Applications**.
2. Open Music from Applications. The first time, macOS blocks it; see the next section.

This is a separate app from Apple Music, which stays untouched.

#### Opening the app the first time

The app is not notarized by Apple, which costs a yearly developer fee. macOS therefore refuses to open it until
you allow it once. You only need to do this after installing or updating.

- **macOS 15 Sequoia and later**
  1. Double-click Music and close the "Apple could not verify" message.
  2. Open **System Settings → Privacy & Security** and scroll down to the security section.
  3. Next to the note that Music was blocked, click **Open Anyway**, then confirm with your password.
- **macOS 14 Sonoma and earlier**
  1. In Applications, right-click (or Control-click) Music and choose **Open**.
  2. Click **Open** in the dialog.

If macOS instead says **"Music is damaged and can't be opened"**, the app isn't damaged: macOS has marked the
download as untrusted. Remove that mark in Terminal, then open the app again:

```
xattr -dr com.apple.quarantine /Applications/Music.app
```

#### Updating on macOS

Quit the running app first with Cmd+Q, then drag the new Music onto Applications and choose **Replace**. If
the old app is still running, opening the new one only brings back the old window. Allow the new version once,
as above.

### Linux

**AppImage**, which runs on most distributions:

```
chmod +x Music-*.AppImage
./Music-*.AppImage
```

**Debian and Ubuntu**, which also adds Music to your applications menu:

```
sudo apt install ./music-desktop_*_amd64.deb
```

## First start

- The app uses your system's Music folder, for example `~/Music`. If that folder doesn't exist, it asks you to
  choose one.
- It reads your whole collection the first time. Albums appear while it works, and a counter at the bottom
  shows how many songs it has found. Large collections can take several minutes.
- To play on a phone, open the menu in the bottom-right corner, choose **Share**, and scan the QR code with a
  phone on the same Wi-Fi.
- Ctrl+Q quits the app, or Cmd+Q on macOS.

## Troubleshooting

**macOS won't open the app.**
Follow the steps in [Opening the app the first time](#opening-the-app-the-first-time). For the "damaged"
message, run the `xattr` command shown there.

**The AppImage doesn't start on Ubuntu 22.04 or later.**
AppImages need the FUSE 2 library, which newer Ubuntu releases don't install by default. Install it with
`sudo apt install libfuse2` on 22.04, or `sudo apt install libfuse2t64` on 24.04 and later. You can also
start it without FUSE:

```
./Music-*.AppImage --appimage-extract-and-run
```

**No albums, or some albums are missing.**
While the counter at the bottom is visible, the app is still reading your collection, and albums keep
appearing. Afterwards, check that the files are inside your system's Music folder: the app looks only there.
New files are picked up automatically within an hour.

**A phone can't open the shared link.**
The phone and the computer must be on the same network. Guest Wi-Fi networks often keep devices apart. If
your computer has a firewall, allow Music to accept incoming connections. If you switched networks, open
Share again to get a fresh QR code.

**"Navidrome stopped" appears on start.**
Another copy of the app may still be running. Quit every copy, on macOS also from the Dock, and start it
again. If the message returns, reset the app as described below.

**The visualizer stays black.**
It needs WebGL 2 graphics support. Updating the graphics drivers usually helps, especially on Linux.

**The window has no title bar, or you want to hide it.**
Turn **native window frame** on or off under **Settings → Appearance**, reached from the top-right menu.

**Starting over.**
Quit the app and delete its data folder. It holds only the app's own index, settings and passwords, never
your music files.

| System | Data folder |
|---|---|
| macOS | `~/Library/Application Support/Music/navidrome` |
| Linux | `~/.config/Music/navidrome` |

The next start reads your collection from scratch. Share links and QR codes change, so phones need to scan
the new code.

## Building from source

See [desktop/README.md](desktop/README.md) for the desktop app and [frontend/README.md](frontend/README.md)
for the web frontend.
