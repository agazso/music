<script lang="ts">
  import Drawer from './Drawer.svelte';
  import { jump, player } from './player.svelte';

  let { onclose }: { onclose: () => void } = $props();
  const fmt = (s = 0) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  // bring the playing song into view when the panel opens or the track changes
  const reveal = (el: HTMLElement, active: boolean) => { $effect(() => { if (active) el.scrollIntoView({ block: 'center' }); }); };
</script>

<!-- closing with the handle keeps the top bar hidden until the next interaction -->
<Drawer onclose={() => { onclose(); player.topHidden = true; }}>
  <div class="list">
    {#each player.queue as s, i (`${i}:${s.id}`)}
      <button class="song" class:current={i === player.index} onclick={() => jump(i)} use:reveal={i === player.index}>
        <span class="n">{s.track ?? i + 1}</span>
        <span class="t">{s.title}<small>{s.artist}</small></span>
        <span class="d">{fmt(s.duration)}</span>
      </button>
    {/each}
  </div>
</Drawer>

<style>
  .list { font-size: calc(16 * var(--s)); overflow-y: auto; padding: calc(8 * var(--s)) calc(24 * var(--s)) calc(24 * var(--s)); scrollbar-width: thin; scrollbar-color: #333 #0000; }
  .song {
    all: unset; cursor: pointer; display: grid; grid-template-columns: calc(48 * var(--s)) 1fr auto; align-items: center; gap: calc(16 * var(--s));
    width: 100%; box-sizing: border-box; padding: calc(10 * var(--s)) calc(12 * var(--s)); border-radius: 2px; color: #bbb;
  }
  .song:hover, .song:focus-visible { background: rgba(0, 0, 0, 0.35); color: #fff; }
  /* current: darker than the panel, with the cards' glassy sheen and edge light */
  .song.current {
    color: #fff; font-size: 1.15em; border-radius: 0;
    /* full panel width: cancel the list's side padding and keep the text aligned */
    margin: calc(4 * var(--s)) calc(-24 * var(--s)); width: calc(100% + 48 * var(--s));
    padding: calc(14 * var(--s)) calc(36 * var(--s));
    background:
      linear-gradient(115deg, #fff0 0%, #fff0 18%, rgba(255, 255, 255, 0.07) 30%, rgba(255, 255, 255, 0.02) 42%, #fff0 50%),
      rgba(0, 0, 0, 0.6);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.08),
      inset 1px 1px 0 rgba(255, 255, 255, 0.07),
      inset -1px -1px 0 rgba(0, 0, 0, 0.3);
  }
  .n { opacity: .5; font-variant-numeric: tabular-nums; text-align: right; }
  .t { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .t small { display: block; font-size: .8em; opacity: .55; }
  .d { opacity: .5; font-variant-numeric: tabular-nums; }
  .current .n::before { content: '▶'; font-size: .7em; margin-right: .4em; }
</style>
