<script lang="ts">
  import { onMount } from 'svelte';
  import { audioGraph, player } from './player.svelte';

  // background: behind the grid instead of fullscreen; no keys, no click to close, and half resolution so the
  // grid keeps scrolling at full rate on top of it
  let { background = false }: { background?: boolean } = $props();
  let canvas: HTMLCanvasElement;
  let host: HTMLDivElement;
  let error = $state('');
  let name = $state('');       // preset name, shown briefly after a key press (not on automatic changes)
  let cycling = $state(true);  // R toggles, Scroll Lock locks
  let vis: import('butterchurn').Visualizer | undefined;
  let names: string[] = [], presets: Record<string, object> = {};
  const history: string[] = [];
  let nameTimer = 0, cycleTimer = 0;

  function flash(n: string) { name = n; clearTimeout(nameTimer); nameTimer = window.setTimeout(() => (name = ''), 3000); }
  function show(n: string, blend: number, announce = false) {
    vis?.loadPreset(presets[n], blend);
    if (announce) flash(n);
  }
  function next(blend: number, announce = false) {
    const n = names[Math.floor(Math.random() * names.length)];
    history.push(n); show(n, blend, announce);
  }
  function prev() { history.pop(); const n = history[history.length - 1]; if (n) show(n, 0, true); }
  function setCycling(on: boolean) {
    cycling = on; clearInterval(cycleTimer);
    if (on) cycleTimer = window.setInterval(() => next(2.7), 15000);
    const n = history[history.length - 1]; if (n) flash(n); // show the lock state next to the name
  }
  // Milkdrop keys: Space next (blend), H hard cut, Backspace previous, R toggle cycling, Scroll Lock lock, T song title
  function onkeydown(e: KeyboardEvent) {
    if (background) return;
    if (e.key === ' ') next(2.7, true);
    else if (e.key === 'h' || e.key === 'H') next(0, true);
    else if (e.key === 'Backspace') prev();
    else if (e.key === 'r' || e.key === 'R') setCycling(!cycling);
    else if (e.key === 'ScrollLock') setCycling(!cycling);
    else if ((e.key === 't' || e.key === 'T') && player.song) vis?.launchSongTitleAnim(`${player.song.artist} — ${player.song.title}`);
    else if (e.key === 'Escape') player.visOpen = false;
    else return;
    e.preventDefault();
  }

  onMount(() => {
    if (!document.createElement('canvas').getContext('webgl2')) { error = 'WebGL2 is not available in this browser'; return; }
    let raf = 0;
    const { ctx, node } = audioGraph();
    const dpr = background ? 0.5 : devicePixelRatio || 1;
    const size = () => { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; vis?.setRendererSize(innerWidth * dpr, innerHeight * dpr); };
    size();
    // engine and presets are loaded only when the visualizer opens; they are heavy
    Promise.all([import('butterchurn'), import('butterchurn-presets')]).then(([bc, pk]) => {
      presets = pk.default.getPresets(); names = Object.keys(presets);
      // the 2.4.7 preset pack is precompiled JS, so onlyUseWASM would reject every preset
      vis = bc.default.createVisualizer(ctx, canvas, {
        width: innerWidth * dpr, height: innerHeight * dpr, pixelRatio: 1, meshWidth: 32, meshHeight: 24,
      });
      vis.connectAudio(node);
      next(0); setCycling(true);
      const loop = () => { vis!.render(); raf = requestAnimationFrame(loop); };
      loop();
    }).catch((e) => (error = String(e)));
    const ro = new ResizeObserver(size);
    ro.observe(host);
    if (!background) host.requestFullscreen?.().catch(() => {});
    const onfs = () => { if (!background && !document.fullscreenElement) player.visOpen = false; };
    document.addEventListener('fullscreenchange', onfs);
    return () => {
      cancelAnimationFrame(raf); clearInterval(cycleTimer); clearTimeout(nameTimer); ro.disconnect();
      document.removeEventListener('fullscreenchange', onfs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      vis?.disconnectAudio(node); // butterchurn has no destroy(); dropping the refs is the cleanup
    };
  });
</script>

<svelte:window {onkeydown} />

<div class="vis" class:bg={background} bind:this={host} onclick={() => { if (!background) player.visOpen = false; }} role="presentation">
  <canvas bind:this={canvas}></canvas>
  {#if name}<span class="name">{name}{#if !cycling} · locked{/if}</span>{/if}
  {#if error}<p>{error}</p>{/if}
</div>

<style>
  .vis { position: fixed; inset: 0; background: #000; z-index: 3; cursor: none; }
  .vis.bg { z-index: -1; cursor: auto; pointer-events: none; }
  canvas { width: 100%; height: 100%; display: block; }
  .name { position: absolute; left: 20px; bottom: 16px; color: #fff; opacity: .6; font-size: 12px; letter-spacing: .1em; text-shadow: 0 1px 4px #000; }
  p { position: absolute; inset: 0; margin: 0; display: grid; place-content: center; color: #888; font-size: 14px; }
</style>
