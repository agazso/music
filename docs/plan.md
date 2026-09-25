# Svelte music frontend for Navidrome — plan and research

Research date: 2026-09-25.

## 1. What exists today

### Popular web frontends for Navidrome

All talk to the Subsonic/OpenSubsonic API and deploy as a static SPA or Docker image.

| Client | Stack | Gapless | ReplayGain | Lyrics | Visualizer | PWA | Status |
|---|---|---|---|---|---|---|---|
| Navidrome built-in UI | React 17 + react-admin + Redux, MUI | no | yes | yes | no | yes | active, rewrite on react-admin 5/6 in progress |
| Feishin (~10k stars) | React 19, Zustand, TanStack Query, Mantine | yes (2 players ping-pong) | yes | synced | no | yes | very active, also Electron with MPV |
| Aonsoku (~1k) | React 18, Zustand, TanStack Query, shadcn/Tailwind | no | ? | synced (LRCLIB) | no | no | active |
| Airsonic-refix / Airdrome fork | Vue 2.7, Pinia, Bootstrap | Airdrome yes | Airdrome yes | no | no | Airdrome yes | refix slow, Airdrome very active |
| ampcast | React 19 + RxJS | yes | yes | yes | **Milkdrop via Butterchurn** | yes | very active, multi-source |
| VD39/subsonic-player | Nuxt 4 / Vue 3 | crossfade | yes | no | no | yes | active |
| Castafiore | React Native + Expo web | ? | ? | yes | no | yes | active, offline |
| Jamstash, Subplayer, Aurial, Sonixd | AngularJS / React CRA / Electron | | | | | | dead or archived |

### Svelte-based clients

Thin on the ground:

- **tinysub** — Svelte + Vite PWA, very active, hosted on tangled.org, has a wave visualizer. Closest existing thing to a "Svelte Subsonic PWA".
- **Mist** — Svelte 5 + Vite, early, desktop-only.
- **NaviThingy** — Tauri + Svelte desktop, not a web build.
- **mutiny-music-svelte** — the only SvelteKit client, stale since 2025.

A Svelte + Milkdrop client is a real gap. Only ampcast (React) does Milkdrop today.

### Desktop / mobile (brief)

- Desktop: Supersonic (Go + Fyne + MPV, 2.4k stars), Sonixd (archived, superseded by Feishin), Psysonic, Sonora.
- Android: Symfonium (closed, paid), Tempo (stale) / Tempus fork (active), Ultrasonic (GitLab), Musly, Navic.
- iOS: play:Sub (closed, paid), Amperfy (Swift, active), substreamer.

### Approaches the field has converged on

- **Pure static SPA, no backend.** Navidrome sets `Access-Control-Allow-Origin: *`, so the browser calls the Subsonic API directly with token+salt auth in query params. Nobody proxies. Recommended deploy is same-origin behind one reverse proxy anyway, to avoid mixed-content and duplicate CORS headers.
- **Query cache + small store.** React clients use TanStack Query for API caching and Zustand for player/queue state. Vue ones use Pinia.
- **HTML5 audio as the base**, optionally routed through Web Audio for gain and analysis. Gapless is done with two alternating `<audio>` elements. Nobody uses MediaSource stitching.
- **MediaSession API** everywhere for lock screen and media keys.
- **Feature detect via `getOpenSubsonicExtensions`.** Navidrome advertises `transcodeOffset`, `formPost`, `songLyrics`, `indexBasedQueue`, `transcoding`, `playbackReport`, `topSongsByArtistId`.

## 2. Plan

### Stack

- SvelteKit with `adapter-static` and `ssr = false`, Svelte 5 runes, TypeScript, Tailwind. Butterchurn touches `window` at construction, so a client-only SPA avoids a whole class of SSR bugs.
- One published dependency for the API: `subsonic-api` npm package (v3.4.0, Sep 2026, zero deps, fully typed, covers OpenSubsonic, gives `streamURL` and `getCoverArtURL` helpers).
- Everything else is platform: `fetch`, `<audio>`, Web Audio, MediaSession, `localStorage`.

### Skipped on purpose

Offline caching, multi-server, Navidrome's undocumented native REST API, smart-playlist editor, Electron/Tauri, MSE-based gapless. All are proven optional by the clients above; each is a later add.

### Architecture (one process, no server)

```
src/lib/api.ts             subsonic-api instance, creds in localStorage, formPost: true
src/lib/player.svelte.ts   $state: queue, index, playing, position; one <audio crossorigin="anonymous">
                           -> AudioContext -> GainNode -> destination; MediaSession handlers
src/lib/visualizer.ts      Butterchurn wrapper: connectAudio(gainNode), rAF loop only while playing
src/routes/                login, albums (grid, sort by type), album/[id], artists, artist/[id],
                           playlists, playlist/[id], search, starred, now-playing (visualizer)
```

### Milestones

1. **Walking skeleton.** Scaffold, login page storing server URL and creds, album grid via `getAlbumList2`, album page via `getAlbum`, click a track and it plays through `<audio>`. Vite `server.proxy` for `/rest` in dev.
2. **Full browsing and a proper player.** Artists, playlists, `search3`, starred, star/unstar, queue with next/prev/shuffle/repeat, persisted queue via `savePlayQueueByIndex`. MediaSession metadata and handlers. Scrobble with `submission=false` at start and `submission=true` at 50 % or 4 minutes (streaming never counts as a play). Use `format=raw` for browser-native formats so seeking works. Transcoded streams have no `Content-Length` and are unseekable: seek by re-requesting with `timeOffset`, read `X-Content-Duration` for the UI.
3. **Milkdrop.** `butterchurn@3.0.0-beta.5` (ESM) + `butterchurn-presets@2.4.7` minimal pack, or lazy-fetch per-preset JSON to keep the bundle small. Gate on WebGL2, pass `onlyUseWASM: true`, add `wasm-unsafe-eval` to CSP, call `setRendererSize` from a ResizeObserver, cancel the rAF loop on unmount (no `destroy()`). Hand-write a small `.d.ts` since none ships. Preset picker, random cycling every 15 s with 2.7 s blend, fullscreen. Fallback to a plain AnalyserNode bar visualizer where WebGL2 is missing.
4. **Polish.** Near-gapless via two alternating audio elements, ReplayGain using the existing GainNode, synced lyrics via `getLyricsBySongId`, PWA manifest and service worker, dark/light theme, keyboard shortcuts.

### Gotchas that decide the design early

- The `<audio>` element must have `crossOrigin = "anonymous"` set **before** `src`, or every downstream Web Audio node outputs silence (Web Audio spec §1.22.4). Navidrome's wildcard CORS satisfies it, but an http Navidrome behind an https client will not work at all (mixed content).
- Navidrome 0.64 re-encoded all IDs. Never persist entity IDs longer than a session except the queue; re-sync on server version change.
- OpenSubsonic API key auth (PR #6219) is not merged yet; use token+salt.

### Alternative to building

ampcast already does Navidrome + Milkdrop; tinysub is the closest Svelte codebase to fork. Build if the point is owning the code and learning Svelte 5; use ampcast if the point is just listening with visualizers.

## 3. API reference notes

- Base: `<server>/rest/<method>` with `u`, `t=md5(password+s)`, `s`, `v`, `c`, `f=json`. Response wrapped in `subsonic-response`; HTTP 200 even on API errors, check `status`.
- Browsing: `getArtists`, `getArtist`, `getAlbum`, `getSong`, `getGenres`, `getAlbumList2?type=...`, `getStarred2`, `getRandomSongs`, `search3`, `getSimilarSongs2`, `getTopSongs`.
- Playlists: `getPlaylists`, `getPlaylist`, `createPlaylist`, `updatePlaylist`, `deletePlaylist`.
- Annotation: `star`/`unstar`, `setRating`, `scrobble?id&time&submission`.
- Media: `stream?id&maxBitRate&format&timeOffset&estimateContentLength`, `getCoverArt?id&size` (use the `coverArt` field value as id), `getLyricsBySongId`.
- Queue: `savePlayQueueByIndex` / `getPlayQueueByIndex`.
- CORS: `AllowedOrigins: *`, `AllowCredentials: false`, exposed headers `x-content-duration`, `x-total-count`, `x-nd-authorization`.

## 4. Sources

### Frontends and clients
- https://www.navidrome.org/apps/
- https://github.com/navidrome/navidrome (built-in UI under `ui/`), https://github.com/navidrome/navidrome/milestone/2
- https://github.com/jeffvli/feishin, https://feishin.net/
- https://github.com/victoralvesf/aonsoku
- https://github.com/tamland/airsonic-refix, https://github.com/JPGuillemin/Airdrome
- https://github.com/rekkyrosso/ampcast
- https://github.com/VD39/subsonic-player
- https://github.com/sawyerf/Castafiore
- https://github.com/jeffvli/sonixd, https://github.com/tsquillario/Jamstash, https://github.com/peguerosdc/subplayer
- https://tangled.org/devins.page/tinysub, https://lobste.rs/s/pfrdqs/tinysub_full_featured_web_player_for_open
- https://github.com/Kusefiru/Mist, https://github.com/vMohammad24/NaviThingy, https://github.com/otakuryo/mutiny-music-svelte
- https://github.com/supersonic-app/supersonic, https://github.com/BLeeEZ/amperfy, https://github.com/eddyizm/tempus, https://symfonium.app/

### Subsonic / OpenSubsonic API and Navidrome internals
- https://www.navidrome.org/docs/developers/subsonic-api/
- https://opensubsonic.netlify.app/docs/ and https://opensubsonic.netlify.app/docs/extensions/
- https://github.com/navidrome/navidrome/issues/2695 (OpenSubsonic tracking)
- https://raw.githubusercontent.com/navidrome/navidrome/master/server/subsonic/opensubsonic.go
- https://raw.githubusercontent.com/navidrome/navidrome/master/server/subsonic/middlewares.go (auth)
- https://raw.githubusercontent.com/navidrome/navidrome/master/server/middlewares.go (CORS)
- https://github.com/navidrome/navidrome/issues/6170 (transcoded streams unseekable)
- https://github.com/navidrome/navidrome/issues/3660 (CORS configurability)
- https://github.com/navidrome/navidrome/discussions/3765 (native API undocumented)
- https://github.com/navidrome/navidrome/pull/6219 (API key auth, still open)
- https://github.com/navidrome/navidrome/releases/tag/v0.64.0 (ID format change)
- https://www.navidrome.org/docs/usage/configuration/options/
- https://www.npmjs.com/package/subsonic-api, https://github.com/explodingcamera/subsonic-api
- https://www.npmjs.com/package/@audioling/open-subsonic-api-client

### Web playback
- https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API
- https://web.dev/articles/mse-seamless-playback
- https://github.com/regosen/Gapless-5, https://github.com/RelistenNet/gapless.js
- https://raw.githubusercontent.com/tamland/airsonic-refix/master/src/player/audio.ts (two-element gapless reference)

### Milkdrop in the browser
- https://github.com/jberg/butterchurn, https://butterchurnviz.com
- https://github.com/jberg/butterchurn-presets
- https://www.npmjs.com/package/butterchurn, https://www.npmjs.com/package/butterchurn-presets, https://www.npmjs.com/package/butterchurn-presets-baron
- https://jordaneldredge.com/blog/speeding-up-winamps-music-visualizer-with-webassembly/
- https://github.com/captbaritone/webamp (`packages/webamp/js/components/MilkdropWindow/Visualizer.tsx`), https://docs.webamp.org/docs/features/mikdrop/, https://docs.webamp.org/docs/guides/cors
- https://github.com/Ariazonaa/jellysic (Svelte 5 + Butterchurn integration example)
- https://github.com/music-assistant/frontend (Vue 3 + Butterchurn fork)
- https://github.com/projectM-visualizer/projectm, https://raw.githubusercontent.com/projectM-visualizer/projectm/master/docs/emscripten.rst, https://github.com/projectM-visualizer/projectm/issues/864
- https://github.com/hvianna/audioMotion-analyzer (AGPL), https://github.com/foobar404/wave.js
- https://www.w3.org/TR/webaudio-1.1/ (section 1.22.4, cross-origin media outputs silence)
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/crossOrigin
- https://github.com/katspaugh/wavesurfer.js/issues/2014
