<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import QRCode from 'qrcode';
  import { player } from './player.svelte';
  import { shareLink } from './sharing.svelte';

  // 'bottom': rises from the player bar and leaves it visible
  // 'right': slides in from the right and fills exactly the space between top bar, side panel and player bar
  let { onclose, from = 'bottom' }: { onclose: () => void; from?: 'bottom' | 'right' } = $props();
  let link = $state(''), qr = $state(''), error = $state('');
  shareLink()
    .then(async (l) => { link = l; qr = await QRCode.toDataURL(l, { width: 640, margin: 2, color: { dark: '#000000', light: '#ffffff' } }); })
    .catch((e) => (error = (e as Error).message));
</script>

<div class="panel" class:right={from === 'right'} transition:fly={from === 'right' ? { x: 600, duration: 420, easing: cubicOut } : { y: 400, duration: 420, easing: cubicOut }}>
  <button class="handle" onclick={onclose} aria-label={from === 'right' ? 'Back' : 'Close'}>{from === 'right' ? '›' : '⌄'}</button>
  <div class="body">
    {#if qr}
      <img class="qr" src={qr} alt="QR code to open this library" />
      <p class="link">{link.replace(/#.*$/, '')}</p>
      <p class="note">scan with a phone on the same network · the link includes the share account, keep it to people you trust</p>
    {:else if error}
      <p class="note">{error}</p>
    {/if}
  </div>
</div>

<style>
  .panel {
    --s: clamp(0.85px, 100vw / 1600, 1.3px);
    position: fixed; inset: 0; padding: 0 0 var(--botbar, 0px); box-sizing: border-box;
    display: flex; flex-direction: column; background: rgba(0, 0, 0, 0.85); color: #eee; z-index: 1;
  }
  /* right variant: the bottom layout rotated — content fills the space, chevron on the right edge, centred, pointing right */
  .panel.right { inset: var(--topbar, 0px) var(--sidebar, 0px) var(--botbar, 0px) 0; padding: 0; z-index: 1; flex-direction: row-reverse; }
  .right .body { min-height: 0; min-width: 0; }
  .right .qr { flex: 1 1 0; min-height: 0; width: auto; max-width: 100%; height: auto; object-fit: contain; }
  .handle { all: unset; cursor: pointer; align-self: center; padding: calc(6 * var(--s)) calc(28 * var(--s)); font-size: calc(32 * var(--s)); line-height: 1; color: #fff; opacity: .6; }
  .right .handle { align-self: center; padding: calc(28 * var(--s)) calc(10 * var(--s)); }
  .handle:hover { opacity: 1; }
  .body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(16 * var(--s)); padding: calc(24 * var(--s)); }
  .qr { width: min(60vh, 80vw); border-radius: 6px; box-shadow: 0 8px 40px #000; }
  .link { margin: 0; font-size: calc(16 * var(--s)); opacity: .8; letter-spacing: .05em; }
  .note { margin: 0; font-size: calc(12 * var(--s)); opacity: .5; text-align: center; max-width: 60ch; }
  @media (hover: none), (pointer: coarse) { .panel { z-index: 1; } }
</style>
