<script lang="ts">
  import { coverUrl } from './api.svelte';
  import { player, seek, toggle } from './player.svelte';
  import Queue from './Queue.svelte';
  let { hidden }: { hidden: boolean } = $props();
  // publish the bar height so the song list can pad for it
  let barHeight = $state(0);
  $effect(() => { document.documentElement.style.setProperty('--botbar', `${barHeight}px`); });
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
</script>

{#if player.song}
  {#if player.queueOpen}<Queue onclose={() => (player.queueOpen = false)} />{/if}
  <div class="bar" class:hidden={hidden && !player.queueOpen} bind:clientHeight={barHeight}>
    <button class="cover" onclick={() => (player.queueOpen = !player.queueOpen)} aria-label="Show songs" aria-expanded={player.queueOpen}>
      <img src={coverUrl(player.song.coverArt, 96)} alt="" />
    </button>
    <span class="meta"><b>{player.song.title}</b> <span>{player.song.artist}</span></span>
    <button class="vis" onclick={() => (player.visOpen = true)} aria-label="Visualizer" title="Visualizer">
      <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M3 12h2l2-6 3 12 3-9 2 6 2-3h4" />
      </svg>
    </button>
    <span class="ctl">
      <button onclick={toggle} aria-label={player.playing ? 'Pause' : 'Play'}>{player.playing ? '❚❚' : '▶'}</button>
      <span class="time">{fmt(player.time)} / {fmt(player.duration)}</span>
    </span>
    <div class="progress" role="slider" tabindex="0" aria-label="Seek" aria-valuenow={player.time}
      onclick={(e) => seek(e.offsetX / e.currentTarget.clientWidth)}
      onkeydown={(e) => { if (e.key === 'ArrowLeft') seek((player.time - 10) / player.duration); if (e.key === 'ArrowRight') seek((player.time + 10) / player.duration); }}>
      <i style:width="{player.duration ? (player.time / player.duration) * 100 : 0}%"></i>
    </div>
  </div>
{/if}

<style>
  .bar {
    --s: clamp(0.85px, 100vw / 1600, 1.3px);
    position: fixed; left: 0; right: 0; bottom: 0; height: calc(96 * var(--s)); padding: 0 calc(16 * var(--s));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    display: flex; align-items: center; gap: calc(12 * var(--s)); color: #eee; font-size: calc(20 * var(--s));
    background: rgba(0, 0, 0, 0.6); opacity: .95; transition: opacity 600ms; z-index: 2;
  }
  .bar.hidden:not(:hover) { opacity: 0; } /* stays visible while the mouse rests on it */
  .cover { all: unset; cursor: pointer; display: flex; flex-shrink: 0; }
  .bar img { width: calc(56 * var(--s)); height: calc(56 * var(--s)); object-fit: cover; opacity: .95; }
  .cover:hover img { opacity: 1; }
  .meta { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta b { font-weight: 500; color: #fff; }
  .meta span { opacity: .7; margin-left: 8px; }
  .bar button { all: unset; cursor: pointer; font-size: calc(20 * var(--s)); padding: 4px 12px; opacity: .9; }
  .vis { all: unset; cursor: pointer; display: flex; padding: 4px 8px; opacity: .7; }
  .vis:hover { opacity: 1; }
  .ctl { display: flex; flex-direction: column; align-items: center; gap: 0; flex-shrink: 0; }
  .time { opacity: .7; font-size: .7em; font-variant-numeric: tabular-nums; }
  /* phones: let title/artist take two lines */
  @media (max-width: 700px) {
    .meta { white-space: normal; display: flex; flex-direction: column; line-height: 1.2; }
    .meta b, .meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .meta span { margin-left: 0; }
  }
  .progress { position: absolute; left: 0; right: 0; top: 0; height: 2px; background: #ffffff0a; cursor: pointer; }
  .progress i { display: block; height: 100%; background: #fff5; }
</style>
