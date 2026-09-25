<script lang="ts">
  import { coverUrl } from './api.svelte';
  import { player, seek, toggle } from './player.svelte';
  let { hidden }: { hidden: boolean } = $props();
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
</script>

{#if player.song}
  <div class="bar" class:hidden>
    <img src={coverUrl(player.song.coverArt, 96)} alt="" />
    <span class="meta"><b>{player.song.title}</b> <span>{player.song.artist}</span></span>
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
  .bar.hidden { opacity: 0; pointer-events: none; }
  .bar img { width: calc(56 * var(--s)); height: calc(56 * var(--s)); object-fit: cover; opacity: .95; }
  .meta { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta b { font-weight: 500; color: #fff; }
  .meta span { opacity: .7; margin-left: 8px; }
  .bar button { all: unset; cursor: pointer; font-size: calc(20 * var(--s)); padding: 4px 12px; opacity: .9; }
  .time { opacity: .7; font-variant-numeric: tabular-nums; }
  .ctl { display: flex; align-items: center; gap: calc(12 * var(--s)); flex-shrink: 0; }
  /* phones: stack play/pause over the time and let title/artist take two lines */
  @media (max-width: 700px) {
    .ctl { flex-direction: column; gap: 0; }
    .meta { white-space: normal; display: flex; flex-direction: column; line-height: 1.2; }
    .meta b, .meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .meta span { margin-left: 0; }
  }
  .progress { position: absolute; left: 0; right: 0; top: 0; height: 2px; background: #ffffff0a; cursor: pointer; }
  .progress i { display: block; height: 100%; background: #fff5; }
</style>
