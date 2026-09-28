import type { AlbumID3, ArtistID3, Child, Playlist } from 'subsonic-api';
import { coverUrl, ok, session } from './api.svelte';
import { play, type Grid } from './player.svelte';

// count: songs behind the tile, for numbering the grid's songs (an artist counts as one, see grid())
export type Tile = { id: string; cover: string; title: string; sub: string; kind: 'album' | 'artist' | 'playlist'; count: number };
export const MODES = ['albums', 'recent', 'random', 'starred', 'artists', 'playlists'] as const;
export type Mode = (typeof MODES)[number];

// visible: what the grid shows after the search and art filters; random picks come from these
export const library = $state({ mode: 'albums' as Mode, tiles: [] as Tile[], visible: [] as Tile[], loading: false, scan: { scanning: false, count: 0 } });

const album = (a: AlbumID3): Tile => ({ id: a.id, cover: coverUrl(a.coverArt), title: a.name, sub: a.artist ?? '', kind: 'album', count: a.songCount ?? 1 });
const artist = (a: ArtistID3): Tile => ({ id: a.id, cover: coverUrl(a.coverArt), title: a.name, sub: 'artist', kind: 'artist', count: 1 });
const playlist = (p: Playlist): Tile => ({ id: p.id, cover: coverUrl(p.coverArt ?? `pl-${p.id}`), title: p.name, sub: 'playlist', kind: 'playlist', count: p.songCount ?? 1 });

let req = 0; // ignore results from a superseded mode switch
let listing = true; // false once an artist pick replaced the mode listing with that artist's albums

// getAlbumList2 caps size at 500; page through and show each page as it lands. A refresh already shows the old
// list, so it swaps in the new one only once complete instead of dropping to the first page in between
async function allAlbums(type: 'alphabeticalByArtist' | 'newest', mine: number, refresh: boolean) {
  const api = session.api!, out: Tile[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = ok(await api.getAlbumList2({ type, size: 500, offset })).albumList2.album ?? [];
    if (mine !== req) return;
    out.push(...page.map(album));
    if (!refresh || page.length < 500) library.tiles = out.slice();
    if (page.length < 500) return;
  }
}

export async function setMode(mode: Mode, refresh = false) {
  const api = session.api!, mine = ++req;
  library.mode = mode; library.loading = true; listing = true;
  if (!refresh) library.tiles = [];
  try {
    switch (mode) {
      case 'albums': await allAlbums('alphabeticalByArtist', mine, refresh); break;
      case 'recent': await allAlbums('newest', mine, refresh); break;
      case 'random': library.tiles = (ok(await api.getAlbumList2({ type: 'random', size: 500 })).albumList2.album ?? []).map(album); break;
      case 'starred': library.tiles = (ok(await api.getStarred2()).starred2.album ?? []).map(album); break;
      case 'artists': {
        const all = (ok(await api.getArtists()).artists.index ?? []).flatMap((i) => i.artist ?? []);
        library.tiles = all.map(artist);
        break;
      }
      case 'playlists': library.tiles = (ok(await api.getPlaylists()).playlists.playlist ?? []).map(playlist); break;
    }
  } finally { if (mine === req) { library.loading = false; warmCovers(); } }
}

// loads the cover thumbnails in grid order in the background, so scrolling or searching later never waits for
// navidrome to resize one: the browser caches them for a year. Covers use Vary: Origin, so the request has to
// look like the grid's <img>, which a fetch() would not. A new list restarts from its top, skipping what is done
const warmed = new Set<string>();
let warmGen = 0;
const preload = (u: string) => new Promise<void>((r) => { const i = new Image(); i.onload = i.onerror = () => r(); i.src = u; });
async function warmCovers() {
  const gen = ++warmGen, todo = library.tiles.map((t) => t.cover).filter((u) => u && !warmed.has(u));
  // ponytail: 4 in flight leaves the browser's per-host connections for the covers on screen
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (todo.length && gen === warmGen) { const u = todo.shift()!; await preload(u); warmed.add(u); }
  }));
}

// navidrome starts its first scan ~2s after it answers ping, so a one-off check after login misses it; polling
// also catches the hourly rescans. The counter ticks every second; the list is reloaded every 5th tick while
// scanning and once when it ends. A random pick is only redrawn while empty, so it does not reshuffle under the user
let wasScanning = false, tick = 0;
export function watchScan() {
  setInterval(async () => {
    if (!session.api) return;
    const s = ok(await session.api.getScanStatus()).scanStatus;
    library.scan = { scanning: s.scanning, count: s.count ?? 0 };
    const due = !s.scanning || tick++ % 5 === 0, still = library.mode === 'random' && library.tiles.length;
    if (listing && (s.scanning || wasScanning) && due && !still) setMode(library.mode, true);
    wasScanning = s.scanning;
  }, 1000);
}

const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

// the songs behind a tile; for an artist, those of one of their albums at random
async function songsOf(t: Tile): Promise<Child[]> {
  const api = session.api!;
  if (t.kind === 'album') return ok(await api.getAlbum({ id: t.id })).album.song ?? [];
  if (t.kind === 'playlist') return ok(await api.getPlaylist({ id: t.id })).playlist.entry ?? [];
  const albums = ok(await api.getArtist({ id: t.id })).artist.album ?? [];
  return albums.length ? songsOf(album(rnd(albums))) : [];
}

export async function pick(t: Tile) {
  if (t.kind !== 'artist') return play(await songsOf(t));
  const a = ok(await session.api!.getArtist({ id: t.id })).artist;
  req++; listing = false;
  library.tiles = (a.album ?? []).map(album);
}

// the songs of the visible tiles numbered 0..count-1 in grid order, for random play: a running total of the tiles' song
// counts turns a number into a tile and a track, so no song list is ever downloaded; the album loads when its song plays.
// ponytail: an artist is one number (a random song of a random album of theirs); give it its song count if artist
// grids get played at random a lot
export function grid(): Grid {
  const tiles = library.visible, cum = new Float64Array(tiles.length + 1);
  tiles.forEach((t, i) => (cum[i + 1] = cum[i] + Math.max(1, t.count)));
  return {
    count: cum[tiles.length],
    key: tiles.map((t) => t.id).join(),
    find: (albumId) => { const i = tiles.findIndex((t) => t.kind === 'album' && t.id === albumId); return i < 0 ? -1 : cum[i]; },
    async song(n) {
      let lo = 0, hi = tiles.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m + 1] <= n) lo = m + 1; else hi = m; }
      const t = tiles[lo], songs = t && (await songsOf(t));
      if (!songs?.length) return;
      return t.kind === 'artist' ? rnd(songs) : songs[n - cum[lo]] ?? rnd(songs); // counts can be stale while a scan runs
    },
  };
}
