<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  // a translucent layer over the grid, closed with a chevron.
  // 'bottom': rises from the player bar and leaves it visible
  // 'right': slides in from the right and fills exactly the space between top bar, side panel and player bar
  let { from = 'bottom', onclose, children }: { from?: 'bottom' | 'right'; onclose: () => void; children: Snippet } = $props();
</script>

<div class="panel" class:right={from === 'right'} transition:fly={from === 'right' ? { x: 600, duration: 420, easing: cubicOut } : { y: 400, duration: 420, easing: cubicOut }}>
  <button class="handle" onclick={onclose} aria-label={from === 'right' ? 'Back' : 'Close'}>{from === 'right' ? '›' : '⌄'}</button>
  {@render children()}
</div>

<style>
  .panel {
    --s: clamp(0.85px, 100vw / 1600, 1.3px);
    /* covers the whole viewport underneath the bottom bar, so it sits on the dark panel with no seam */
    position: fixed; inset: 0; padding: 0 0 var(--botbar, 0px); box-sizing: border-box;
    display: flex; flex-direction: column; background: rgba(0, 0, 0, 0.85); color: #eee; z-index: 1;
  }
  /* right variant: the bottom layout rotated — chevron on the right edge, centred, pointing right */
  .panel.right { inset: var(--topbar, 0px) var(--sidebar, 0px) var(--botbar, 0px) 0; padding: 0; flex-direction: row-reverse; }
  .handle { all: unset; cursor: pointer; align-self: center; padding: calc(6 * var(--s)) calc(28 * var(--s)); font-size: calc(32 * var(--s)); line-height: 1; color: #fff; opacity: .6; }
  .right .handle { padding: calc(28 * var(--s)) calc(10 * var(--s)); }
  .handle:hover { opacity: 1; }
</style>
