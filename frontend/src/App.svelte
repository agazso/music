<script lang="ts">
  import { onMount } from 'svelte';
  import { restore, session } from './lib/api.svelte';
  import { library, MODES, pick, setMode } from './lib/library.svelte';
  import { next, player, prev, toggle } from './lib/player.svelte';
  import Bar from './lib/Bar.svelte';
  import Login from './lib/Login.svelte';
  import Grid from './lib/Grid.svelte';

  let ready = $state(false), idle = $state(false), hint = $state(true);
  let idleTimer: ReturnType<typeof setTimeout>;

  onMount(() => { restore().finally(() => (ready = true)); setTimeout(() => (hint = false), 6000); });
  $effect(() => { if (session.api) setMode('albums'); });

  // touch devices have no hover or mouse movement to wake the UI, so never fade it there
  const touch = matchMedia('(hover: none)').matches;
  function wake() { idle = false; player.topHidden = false; clearTimeout(idleTimer); if (!touch) idleTimer = setTimeout(() => (idle = true), 2500); }

  function onkeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const n = Number(e.key);
    if (n >= 1 && n <= MODES.length) setMode(MODES[n - 1]);
    else if (e.key === ' ') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Escape') setMode(library.mode);
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
{/if}

<style>
  .hint {
    --s: clamp(0.85px, 100vw / 1600, 1.3px);
    position: fixed; left: calc(16 * var(--s)); color: #fff; font-size: calc(10 * var(--s)); letter-spacing: .15em; text-transform: uppercase;
    opacity: .3; transition: opacity 600ms; pointer-events: none;
  }
  .hint { bottom: calc(110 * var(--s)); right: calc(16 * var(--s)); display: flex; gap: calc(14 * var(--s)); flex-wrap: wrap; }
  .hint b { opacity: 1; margin-right: 4px; }
  .hidden { opacity: 0; }
</style>
