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
  <!-- the whole strip along the edge closes the drawer; the chevron sits centred in it -->
  <button class="handle" onclick={onclose} aria-label={from === 'right' ? 'Back' : 'Close'}><span>{from === 'right' ? '›' : '⌄'}</span></button>
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
  .handle {
    all: unset; cursor: pointer; align-self: stretch; display: flex; align-items: center; justify-content: center;
    padding: calc(6 * var(--s)) 0; font-size: calc(32 * var(--s)); line-height: 1; color: #fff; transition: background 250ms;
  }
  .right .handle { padding: 0 calc(10 * var(--s)); }
  .handle span { opacity: .6; transition: opacity 250ms, text-shadow 250ms, transform 250ms; }
  .handle:hover, .handle:focus-visible { background: rgba(255, 255, 255, 0.04); }
  /* the chevron swells and gets a tight bright halo plus a wide soft one */
  .handle:hover span, .handle:focus-visible span {
    opacity: 1; font-weight: 700; transform: scale(1.15);
    text-shadow: 0 0 calc(4 * var(--s)) rgba(255, 255, 255, 0.9), 0 0 calc(20 * var(--s)) rgba(255, 255, 255, 0.5);
  }
</style>
