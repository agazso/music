# Navidrome grid frontend

Svelte 5 + Vite, no backend. Talks to Navidrome's Subsonic API straight from the browser.

    pnpm install
    pnpm dev        # http://localhost:5173 (or the next free port)
    pnpm build      # static files in dist/

Log in with your Navidrome URL (default http://localhost:4533), username and password.

## Browsing

Full-width grid of covers styled as glossy vinyl-paper sleeves, over a black vinyl surface that scrolls with
the cards. The top bar fades in as the mouse approaches the top of the window. Its sliders set columns (1–10)
and gap; "with art" hides items without cover art. All three are remembered.

| Key | Action |
|---|---|
| `1`–`6` | switch views: albums A–Z, recent, random, starred, artists, playlists |
| `space` | play / pause |
| `←` `→` | previous / next track |
| `Esc` | reload the current view |
| `?` | show / hide this key list |

Click a cover to play the album or playlist; click an artist to see their albums.

## Player

The bottom bar shows the playing song with a seekable progress line. Clicking its cover slides up the song
list of the current album; click a song to jump to it. Close it with the chevron at the top (keeps the top bar
hidden until the next interaction) or by clicking the cover again. OS media keys work through MediaSession,
and plays are scrobbled to Navidrome after half the track.

## Visualizer

The waveform icon in the bottom bar opens a full-screen Milkdrop visualizer (Butterchurn). Presets cycle
automatically every 15 seconds; every key press below flashes the preset name bottom-left, automatic changes do not. Closing: `Esc`, a click,
or leaving full screen. While it is open it owns the keyboard, so `space` does not pause playback there.

| Key | Action |
|---|---|
| `space` | next preset, smooth blend |
| `H` | next preset, hard cut |
| `backspace` | previous preset |
| `R` or `scroll lock` | toggle automatic cycling (lock the current preset) |
| `T` | song title animation |
| `Esc` | close |
