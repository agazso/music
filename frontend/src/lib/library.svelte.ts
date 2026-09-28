import type { AlbumID3, ArtistID3, Child, Playlist } from 'subsonic-api';
import { coverUrl, ok, session } from './api.svelte';
import { play, player } from './player.svelte';

export type Tile = { id: string; cover: string; title: string; sub: string; kind: 'album' | 'artist' | 'playlist' };
export const MODES = ['albums', 'recent', 'random', 'starred', 'artists', 'playlists'] as const;
export type Mode = (typeof MODES)[number];

// visible: what the grid shows after the search and art filters; random picks come from these
export const library = $state({ mode: 'albums' as Mode, tiles: [] as Tile[], visible: [] as Tile[], loading: false });

const album = (a: AlbumID3): Tile => ({ id: a.id, cover: coverUrl(a.coverArt), title: a.name, sub: a.artist ?? '', kind: 'album' });
const artist = (a: ArtistID3): Tile => ({ id: a.id, cover: coverUrl(a.coverArt), title: a.name, sub: 'artist', kind: 'artist' });
const playlist = (p: Playlist): Tile => ({ id: p.id, cover: coverUrl(p.coverArt ?? `pl-${p.id}`), title: p.name, sub: 'playlist', kind: 'playlist' });

let req = 0; // ignore results from a superseded mode switch

// getAlbumList2 caps size at 500; page through and show each page as it lands
async function allAlbums(type: 'alphabeticalByArtist' | 'newest', mine: number) {
  const api = session.api!, out: Tile[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = ok(await api.getAlbumList2({ type, size: 500, offset })).albumList2.album ?? [];
    if (mine !== req) return;
    out.push(...page.map(album));
    library.tiles = out.slice();
    if (page.length < 500) return;
  }
}

export async function setMode(mode: Mode, refresh = false) {
  const api = session.api!, mine = ++req;
  library.mode = mode; library.loading = true;
  if (!refresh) library.tiles = [];
  try {
    switch (mode) {
      case 'albums': await allAlbums('alphabeticalByArtist', mine); break;
      case 'recent': await allAlbums('newest', mine); break;
      case 'random': library.tiles = (ok(await api.getAlbumList2({ type: 'random', size: 500 })).albumList2.album ?? []).map(album); break;
      case 'starred': library.tiles = (ok(await api.getStarred2()).starred2.album ?? []).map(album); break;
      case 'artists': {
        const all = (ok(await api.getArtists()).artists.index ?? []).flatMap((i) => i.artist ?? []);
        library.tiles = all.map(artist);
        break;
      }
      case 'playlists': library.tiles = (ok(await api.getPlaylists()).playlists.playlist ?? []).map(playlist); break;
    }
  } finally { if (mine === req) library.loading = false; }
  // while a scan is running (first start, new files) keep refreshing so albums appear as they are found
  if (mine === req && ok(await api.getScanStatus()).scanStatus.scanning) setTimeout(() => { if (mine === req) setMode(mode, true); }, 5000);
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
  req++;
  library.tiles = (a.album ?? []).map(album);
}

// one song from one of the visible tiles, both drawn at random; nothing when the grid is empty.
// ponytail: every tile weighs the same whatever its song count; a few retries dodge songs already heard
export async function randomSong(): Promise<Child | undefined> {
  if (!library.visible.length) return;
  const heard = new Set(player.queue.map((s) => s.id));
  let song: Child | undefined;
  for (let i = 0; i < 5 && (!song || heard.has(song.id)); i++) song = rnd(await songsOf(rnd(library.visible))) ?? song;
  return song;
}
