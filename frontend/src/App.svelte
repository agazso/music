<script lang="ts">
  import { onMount } from 'svelte';
  import { restore, session } from './lib/api.svelte';
  import { library, MODES, pick, setMode, watchScan } from './lib/library.svelte';
  import { next, player, prev, toggle } from './lib/player.svelte';
  import Bar from './lib/Bar.svelte';
  import Login from './lib/Login.svelte';
  import Grid from './lib/Grid.svelte';
  import Visualizer from './lib/Visualizer.svelte';

  let ready = $state(false), idle = $state(false), hint = $state(false);
  let idleTimer: ReturnType<typeof setTimeout>;

  onMount(() => { restore().finally(() => (ready = true)); watchScan(); });
  $effect(() => { if (session.api) setMode('albums'); });

  // any pointer activity (mouse move, tap, touch scroll) shows the bars; they fade again after a pause
  function wake() { idle = false; player.topHidden = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => (idle = true), 2500); }

  function onkeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT' || player.visOpen) return; // the visualizer owns the keys while open
    const n = Number(e.key);
    if (n >= 1 && n <= MODES.length) setMode(MODES[n - 1]);
    else if (e.key === ' ') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Escape') { if (player.view) player.view = ''; else if (player.queueOpen) player.queueOpen = false; else setMode(library.mode); }
    else if (e.key === '?') hint = !hint;
    else return;
    wake();
  }
</script>

<svelte:window onkeydown={onkeydown} onpointermove={wake} onpointerdown={wake} />

{#if !ready}
  <!-- black until we know whether a session exists -->
{:else if !session.api}
  <Login />
{:else}
  <Grid tiles={library.tiles} onpick={pick} activeId={player.song?.albumId} hidden={idle} />
  <div class="hint" class:hidden={!hint}>
    {#each MODES as m, i}<span><b>{i + 1}</b> {m}</span>{/each}
    <span><b>space</b> play</span><span><b>← →</b> track</span><span><b>?</b> help</span>
  </div>
  <Bar hidden={idle} />
  {#if player.visOpen}<Visualizer />{/if}
{/if}

<style>
  .hint {
    --s: clamp(0.85px, 100vw / 1600, 1.3px);
    position: fixed; left: 50%; bottom: calc(130 * var(--s)); transform: translateX(-50%);
    display: flex; justify-content: center; gap: calc(12 * var(--s)) calc(28 * var(--s)); flex-wrap: wrap; max-width: 90vw;
    padding: calc(16 * var(--s)) calc(24 * var(--s)); border-radius: 4px; background: rgba(0, 0, 0, 0.7);
    color: #fff; font-size: calc(18 * var(--s)); letter-spacing: .12em; text-transform: uppercase;
    opacity: .95; transition: opacity 600ms; pointer-events: none;
  }
  .hint b { font-weight: 600; margin-right: 6px; }
  .hidden { opacity: 0; }
</style>
