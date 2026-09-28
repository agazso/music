import type { Child } from 'subsonic-api';
import { coverUrl, session, streamUrl } from './api.svelte';

export const player = $state({
  queue: [] as Child[], index: -1, playing: false, time: 0, duration: 0, random: false, queueOpen: false, topHidden: false, visOpen: false, view: '' as '' | 'share' | 'settings', viewFrom: 'bottom' as 'bottom' | 'right',
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

// normal mode plays the whole queue; random mode jumps to the chosen song only, the next one is drawn again
export function play(queue: Child[], index = 0) {
  if (player.random) { if (!queue[index]) return; player.queue.push(queue[index]); player.index = player.queue.length - 1; }
  else { player.queue = queue; player.index = index; }
  load();
}

// random mode: the queue is the history of picks and grows one song at a time as playback reaches its end;
// `more` supplies the next pick (from whatever the grid shows), or nothing, and then playback simply stops
let more: (() => Promise<Child | undefined>) | undefined;
export function toggleRandom(pick: () => Promise<Child | undefined>) {
  player.random = !player.random;
  if (!player.random) return; // the current song plays on; the history stays for prev
  more = pick; player.queue = []; player.index = -1;
  next();
}

function load() {
  const s = player.song;
  if (!s) return;
  scrobbled = false;
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
  else if (player.random) more?.().then((s) => { if (s) { player.queue.push(s); player.index++; load(); } else audio.pause(); }); // nothing to draw from: stop
}
export function prev() { if (audio.currentTime > 3 || player.index === 0) audio.currentTime = 0; else { player.index--; load(); } }
export function seek(fraction: number) { if (player.duration) audio.currentTime = fraction * player.duration; }

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', toggle); ms.setActionHandler('pause', toggle);
  ms.setActionHandler('nexttrack', next); ms.setActionHandler('previoustrack', prev);
  ms.setActionHandler('seekto', (d) => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
}
