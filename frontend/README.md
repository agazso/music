# Navidrome grid frontend

Svelte 5 + Vite, no backend. Talks to Navidrome's Subsonic API straight from the browser.

    pnpm install
    pnpm dev        # http://localhost:5173 (or the next free port)
    pnpm build      # static files in dist/

Log in with your Navidrome URL (default http://localhost:4533), username and password.

Full-width cover grid with the Figma tile styling (rounded, drop shadow, glossy highlight) over a grain texture. Sliders top-right set columns (3–10) and gap (in design units); "with art" hides items without covers.
All three are remembered.
Keys: `1`–`6` switch views (albums A–Z, recent, random, starred, artists, playlists), `space` play/pause,
`←` `→` previous/next track, `Esc` reload the current view, `?` toggles the key hint.
Click a cover to play the album or playlist; click an artist to see their albums.
