import type { Child } from 'subsonic-api';
import { coverUrl, session, streamUrl } from './api.svelte';

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

// normal: the album in order. shuffle: the chosen song, then the rest of the album in random order.
// random: the queue is the history of picks and grows one song at a time as playback reaches its end;
// `more` supplies the next pick (from whatever the grid shows), or nothing, and then playback simply stops
export type Order = 'normal' | 'shuffle' | 'random';
let ordered: Child[] = []; // the album as it came, so leaving shuffle can put it back in order
let more: (() => Promise<Child | undefined>) | undefined;

function shuffled<T>(a: T[]) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export function play(queue: Child[], index = 0) {
  if (player.order === 'random') { if (!queue[index]) return; player.queue.push(queue[index]); player.index = player.queue.length - 1; }
  else {
    ordered = queue;
    if (player.order === 'shuffle') { player.queue = [queue[index], ...shuffled(queue.filter((_, i) => i !== index))]; player.index = 0; }
    else { player.queue = queue; player.index = index; }
  }
  load();
}

// the current song always plays on; only what comes after it changes
export function setOrder(order: Order, pick: () => Promise<Child | undefined>) {
  if (order === player.order) return;
  const was = player.order, cur = player.song;
  player.order = order;
  if (order === 'random') { more = pick; player.queue = []; player.index = -1; next(); return; }
  if (was === 'random') { ordered = player.queue.slice(); return; } // the history stays for prev
  if (order === 'shuffle') player.queue = [...player.queue.slice(0, player.index + 1), ...shuffled(player.queue.slice(player.index + 1))];
  else if (cur) { const i = ordered.findIndex((s) => s.id === cur.id); if (i >= 0) { player.queue = ordered; player.index = i; } }
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

export function jump(i: number) { if (i >= 0 && i < player.queue.length) { player.index = i; load(); } }
export function toggle() { audio.paused ? audio.play().catch(() => {}) : audio.pause(); }
export function next() {
  if (player.index < player.queue.length - 1) { player.index++; load(); }
  else if (player.order === 'random') more?.().then((s) => { if (s) { player.queue.push(s); player.index++; load(); } else audio.pause(); }); // nothing to draw from: stop
}
export function prev() { if (audio.currentTime > 3 || player.index === 0) audio.currentTime = 0; else { player.index--; load(); } }
export function seek(fraction: number) { if (player.duration) audio.currentTime = fraction * player.duration; }

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', toggle); ms.setActionHandler('pause', toggle);
  ms.setActionHandler('nexttrack', next); ms.setActionHandler('previoustrack', prev);
  ms.setActionHandler('seekto', (d) => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
}
