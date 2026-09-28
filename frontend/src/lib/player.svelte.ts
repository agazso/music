import type { Child } from 'subsonic-api';
import { coverUrl, ok, session, streamUrl } from './api.svelte';
import { moveTo, shuffle } from './shuffle';

export const player = $state({
  queue: [] as Child[], index: -1, playing: false, time: 0, duration: 0, order: 'normal' as Order, queueOpen: false, topHidden: false, visOpen: false, view: '' as '' | 'share' | 'settings', viewFrom: 'bottom' as 'bottom' | 'right',
  get song() { return this.queue[this.index] as Child | undefined; },
});

const audio = new Audio();
audio.crossOrigin = 'anonymous'; // needed later for Web Audio / visualizers
audio.preload = 'auto';
let scrobbled = false;

audio.addEventListener('timeupdate', () => {
  player.time = audio.currentTime;
  player.duration = audio.duration || player.song?.duration || 0;
  // Subsonic servers never count a stream as a play; report once past 50% or 4 min
  if (!scrobbled && player.song && (player.time > player.duration / 2 || player.time > 240)) {
    scrobbled = true;
    session.api?.scrobble({ id: player.song.id, submission: true }).catch(() => {});
  }
});
audio.addEventListener('play', () => { player.playing = true; navigator.mediaSession && (navigator.mediaSession.playbackState = 'playing'); });
audio.addEventListener('pause', () => { player.playing = false; navigator.mediaSession && (navigator.mediaSession.playbackState = 'paused'); });
audio.addEventListener('ended', next);

// VLC's model: the playlist stays put and only the order through it changes.
// normal and shuffle: the playlist is the album (the queue, in track order); shuffle walks it through a shuffled index.
// random: the playlist is every song the grid shows, walked through a shuffled index of song numbers (see Grid);
// the queue is then the history of songs played this cycle, queue[i] being the song at position i of the index.
// Next and prev move the cursor; at the end of an album playback stops, random starts a new cycle
export type Order = 'normal' | 'shuffle' | 'random';
// the songs the grid shows, numbered 0..count-1 across its tiles; `key` changes when the grid's contents do
export type Grid = { count: number; key: string; find(albumId: string): number; song(n: number): Promise<Child | undefined> };

let perm = new Uint32Array(0), cursor = -1, gridKey = '';
let grid: (() => Grid) | undefined;

function start(i: number) { player.index = i; load(); }

// an album (or playlist) chosen by hand: from `index`, or from its start, which in shuffle is a random track
export function play(queue: Child[], index = -1) {
  if (player.order === 'random') {
    const s = queue[Math.max(0, index)]; if (!s) return;
    // VLC's select: it becomes the next position of the index, so the cycle goes on around it
    const g = grid?.(), n = g && s.albumId ? g.find(s.albumId) : -1;
    if (g?.key === gridKey && n >= 0) moveTo(perm, n + Math.max(0, index), cursor + 1);
    player.queue = [...player.queue.slice(0, cursor + 1), s]; cursor++;
    return start(cursor);
  }
  player.queue = queue;
  if (player.order === 'shuffle') { perm = shuffle(queue.length, index); cursor = 0; return start(perm[0]); }
  start(Math.max(0, index));
}

// the current song always plays on; only what comes after it changes
export async function setOrder(order: Order, source: () => Grid) {
  if (order === player.order) return;
  const was = player.order, cur = player.song;
  player.order = order; grid = source;
  if (order === 'random') {
    gridKey = ''; // the index is built on the first draw
    player.queue = cur ? [cur] : []; cursor = player.index = player.queue.length - 1;
    if (!cur) next();
    return;
  }
  // leaving random: the playlist becomes the current song's album again
  if (was === 'random' && cur?.albumId) {
    const album = ok(await session.api!.getAlbum({ id: cur.albumId })).album.song ?? [];
    if (player.order !== order || player.song?.id !== cur.id) return; // changed again meanwhile
    player.queue = album; player.index = Math.max(0, album.findIndex((s) => s.id === cur.id));
  }
  if (order === 'shuffle') { perm = shuffle(player.queue.length, player.index); cursor = 0; }
}

async function nextRandom() {
  if (cursor < player.queue.length - 1) return start(++cursor); // forward again through the history after prev
  const g = grid?.();
  if (!g?.count) return;
  const cur = player.song;
  if (g.key !== gridKey || cursor >= perm.length - 1) {
    // a new index when the grid changed or the cycle is done; a finished cycle keeps its last song at position 0
    // so the new one never opens with it. A changed grid numbers its songs anew, so the current one is not placed
    perm = shuffle(g.count, g.key === gridKey && cursor >= 0 ? perm[cursor] : -1); gridKey = g.key;
    player.queue = cur ? [cur] : []; cursor = player.queue.length - 1; player.index = cursor;
  }
  if (cursor + 1 >= perm.length) return; // a single song on the grid
  const s = await g.song(perm[cursor + 1]);
  if (!s) return audio.pause();
  player.queue.push(s); cursor++;
  start(cursor);
}

function load() {
  const s = player.song;
  if (!s) return;
  scrobbled = false;
  graph?.ctx.resume(); // a graph made without a gesture (viz background at start) is suspended, and would mute the element
  audio.src = streamUrl(s.id);
  audio.play().catch(() => {});
  session.api?.scrobble({ id: s.id, submission: false }).catch(() => {});
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: s.title, artist: s.artist, album: s.album,
      artwork: [{ src: coverUrl(s.coverArt, 512), sizes: '512x512' }],
    });
  }
}

// Web Audio graph for visualizers, created lazily on first use (a user gesture) so plain playback
// never depends on it. crossOrigin on the element + Navidrome's wildcard CORS keep it from going silent.
let graph: { ctx: AudioContext; node: GainNode } | null = null;
export function audioGraph() {
  if (!graph) {
    const ctx = new AudioContext();
    const node = ctx.createGain(); // element -> gain -> output; the gain is the tap point (and later ReplayGain)
    ctx.createMediaElementSource(audio).connect(node);
    node.connect(ctx.destination);
    graph = { ctx, node };
  }
  graph.ctx.resume();
  return graph;
}

// the Shuffle key: in order, a random other track of the album; shuffle and random, the next song of their index.
// With nothing left in the album it draws a song from the grid and plays its album from there
export async function jumpRandom(source: () => Grid) {
  grid = source;
  const others = player.queue.map((_, i) => i).filter((i) => i !== player.index);
  if (player.order === 'random') return nextRandom();
  if (player.order === 'normal' && others.length) return start(others[Math.floor(Math.random() * others.length)]);
  if (player.order === 'shuffle' && cursor < perm.length - 1) return start(perm[++cursor]);
  const g = source(), s = g.count ? await g.song(Math.floor(Math.random() * g.count)) : undefined;
  if (!s?.albumId) return;
  const album = ok(await session.api!.getAlbum({ id: s.albumId })).album.song ?? [];
  play(album, Math.max(0, album.findIndex((x) => x.id === s.id)));
}

// a song picked from the list: in shuffle it takes the next position of the index, like VLC's select
export function jump(i: number) {
  if (i < 0 || i >= player.queue.length) return;
  if (player.order === 'random') cursor = i;
  if (player.order === 'shuffle') { moveTo(perm, i, cursor + 1); cursor++; }
  start(i);
}
export function toggle() { audio.paused ? audio.play().catch(() => {}) : audio.pause(); }
export function next() {
  if (player.order === 'random') return void nextRandom();
  if (player.order === 'shuffle') { if (cursor < perm.length - 1) start(perm[++cursor]); return; }
  if (player.index < player.queue.length - 1) start(player.index + 1);
}
export function prev() {
  const back = player.order === 'normal' ? player.index > 0 : cursor > 0;
  if (audio.currentTime > 3 || !back) { audio.currentTime = 0; return; }
  if (player.order === 'normal') start(player.index - 1);
  else if (player.order === 'shuffle') start(perm[--cursor]);
  else start(--cursor);
}
export function seek(fraction: number) { if (player.duration) audio.currentTime = fraction * player.duration; }

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', toggle); ms.setActionHandler('pause', toggle);
  ms.setActionHandler('nexttrack', next); ms.setActionHandler('previoustrack', prev);
  ms.setActionHandler('seekto', (d) => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
}
