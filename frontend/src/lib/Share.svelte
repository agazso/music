<script lang="ts">
  import QRCode from 'qrcode';
  import Drawer from './Drawer.svelte';
  import { shareLink } from './sharing.svelte';

  let { onclose, from = 'bottom' }: { onclose: () => void; from?: 'bottom' | 'right' } = $props();
  let link = $state(''), qr = $state(''), error = $state('');
  shareLink()
    .then(async (l) => { link = l; qr = await QRCode.toDataURL(l, { width: 640, margin: 2, color: { dark: '#000000', light: '#ffffff' } }); })
    .catch((e) => (error = (e as Error).message));
</script>

<Drawer {from} {onclose}>
  <div class="body" class:right={from === 'right'}>
    {#if qr}
      <img class="qr" src={qr} alt="QR code to open this library" />
      <p class="link">{link.replace(/#.*$/, '')}</p>
      <p class="note">scan with a phone on the same network · the link includes the share account, keep it to people you trust</p>
    {:else if error}
      <p class="note">{error}</p>
    {/if}
  </div>
</Drawer>

<style>
  .body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(16 * var(--s)); padding: calc(24 * var(--s)); }
  .qr { width: min(60vh, 80vw); border-radius: 6px; box-shadow: 0 8px 40px #000; }
  /* right variant: the code fills whatever space is left */
  .body.right { min-height: 0; min-width: 0; }
  .body.right .qr { flex: 1 1 0; min-height: 0; width: auto; max-width: 100%; height: auto; object-fit: contain; }
  .link { margin: 0; font-size: calc(16 * var(--s)); opacity: .8; letter-spacing: .05em; }
  .note { margin: 0; font-size: calc(12 * var(--s)); opacity: .5; text-align: center; max-width: 60ch; }
</style>
