import type { AlbumID3, ArtistID3, Playlist } from 'subsonic-api';
import { coverUrl, session } from './api.svelte';
import { play } from './player.svelte';

export type Tile = { id: string; cover: string; title: string; sub: string; kind: 'album' | 'artist' | 'playlist' };
export const MODES = ['albums', 'recent', 'random', 'starred', 'artists', 'playlists'] as const;
export type Mode = (typeof MODES)[number];

export const library = $state({ mode: 'albums' as Mode, tiles: [] as Tile[], title: '', loading: false });

const album = (a: AlbumID3): Tile => ({ id: a.id, cover: coverUrl(a.coverArt), title: a.name, sub: a.artist ?? '', kind: 'album' });
const artist = (a: ArtistID3): Tile => ({ id: a.id, cover: coverUrl(a.coverArt), title: a.name, sub: `${a.albumCount} albums`, kind: 'artist' });
const playlist = (p: Playlist): Tile => ({ id: p.id, cover: coverUrl(p.coverArt ?? `pl-${p.id}`), title: p.name, sub: `${p.songCount} songs`, kind: 'playlist' });

// subsonic-api resolves failed responses instead of throwing
function ok<T extends { status: string }>(r: T): T {
  if (r.status === 'failed') throw new Error((r as { error?: { message: string } }).error?.message ?? 'request failed');
  return r;
}

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

export async function setMode(mode: Mode) {
  const api = session.api!, mine = ++req;
  library.mode = mode; library.title = mode; library.loading = true; library.tiles = [];
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
}

export async function pick(t: Tile) {
  const api = session.api!;
  if (t.kind === 'album') play(ok(await api.getAlbum({ id: t.id })).album.song ?? []);
  else if (t.kind === 'playlist') play(ok(await api.getPlaylist({ id: t.id })).playlist.entry ?? []);
  else {
    const a = ok(await api.getArtist({ id: t.id })).artist;
    req++;
    library.title = a.name;
    library.tiles = (a.album ?? []).map(album);
  }
}
