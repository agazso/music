<script lang="ts">
  import type { Snippet } from 'svelte';

  // a corner key in the top bar with a panel that continues the bar down that edge of the screen. On mouse the panel
  // peeks as the pointer nears the key, opens fully when close by or over the panel, and slides out when the pointer
  // moves away; on touch only the key toggles it. `pinned` keeps it open from outside (a view opened from the panel)
  let { side, label, touch, pinned = false, menu = $bindable(false), open = $bindable(false), width = $bindable(0), onunpin, children }: {
    side: 'left' | 'right'; label: string; touch: boolean; pinned?: boolean;
    menu?: boolean; open?: boolean; width?: number; onunpin?: () => void; children: Snippet;
  } = $props();
  const right = $derived(side === 'right');
  let hoverOpen = $state(false), prox = $state(0);
  // after the key closes the panel, hover must not reopen it until the pointer has moved away
  let hoverMuted = false;
  let corner: HTMLElement, panel: HTMLElement;
  $effect(() => { open = menu || hoverOpen || pinned; });

  // pointer distance from the centre of the key
  function dist(e: MouseEvent) { const r = corner.getBoundingClientRect(); return Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); }
  // the block from the key to the screen edge and from the top down to the key counts as on the key,
  // so the screen corner itself (further from the key's centre than the hover radius) never reads as "away"
  function atKey(e: MouseEvent) { const r = corner.getBoundingClientRect(); return (right ? e.clientX >= r.left - 8 : e.clientX <= r.right + 8) && e.clientY <= r.bottom + 8; }
  function onmove(e: PointerEvent) {
    if (touch || !corner) return;
    const d = dist(e);
    prox = Math.min(1, Math.max(0, 1 - d / 220));
    const p = panel.getBoundingClientRect();
    const overPanel = hoverOpen && (right ? e.clientX >= p.left - 8 : e.clientX <= p.right + 8) && e.clientY >= p.top;
    const close = d < 90 || atKey(e) || overPanel;
    if (!close) hoverMuted = false;
    hoverOpen = close && !hoverMuted;
  }
</script>

<!-- the pointer leaves the window when it is slammed into the screen corner (frameless window, second monitor):
     leaving near the key opens the panel or keeps it open, leaving anywhere else closes it -->
<svelte:document onmouseleave={(e) => { prox = 0; hoverOpen = !touch && !!corner && (dist(e) < 220 || atKey(e)) && !hoverMuted; }} />
<!-- .panel: closing a view opened from here with its chevron keeps the menu open -->
<svelte:window onclick={(e) => { const t = e.target as Element; if (menu && !pinned && !corner.contains(t) && !panel.contains(t) && !t.closest('.panel')) menu = false; }} onpointermove={onmove} />

<!-- while the panel is open for any reason (menu, hover, pinned) a press closes it all, so the depressed key always works as a close key on touch -->
<span class="corner" class:right bind:this={corner}>
  <button class="menu" class:down={open} style:--prox={prox.toFixed(2)} onclick={() => { if (pinned) onunpin?.(); menu = !open; hoverMuted = !menu; hoverOpen = false; }} aria-haspopup="menu" aria-expanded={open}>
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    <span class="cur">{label}</span>
  </button>
</span>

<!-- hidden fully off-screen, peeks as the pointer approaches the key -->
<div class="side" class:right class:open role="menu" aria-hidden={!open} bind:this={panel} bind:clientWidth={width}
  style:transform={open ? 'translateX(0)' : `translateX(calc(${right ? 1 : -1} * (100% - ${(prox * 12).toFixed(1)}px)))`}>
  {@render children()}
</div>

<style>
  .corner { position: absolute; left: calc(20 * var(--s)); top: 50%; transform: translateY(-50%); }
  .corner.right { left: auto; right: calc(20 * var(--s)); }
  /* the key: subtle brushed metal. It lifts and brightens as the pointer approaches (--prox 0…1) and sits pressed in
     while the panel is open. The label sits on the key's inner side, so the icon marks the screen edge */
  .menu {
    all: unset; cursor: pointer; position: relative; overflow: hidden; display: flex; flex-direction: row-reverse; align-items: center; gap: calc(8 * var(--s));
    padding: calc(6 * var(--s)) calc(12 * var(--s)); border-radius: 4px; border: 1px solid #000;
    background: linear-gradient(170deg, #3b3b3b, #232323 55%, #2b2b2b);
    box-shadow: inset 0 1px 0 #ffffff26, inset 0 -1px 0 #00000090, 0 1px 2px #000b;
    opacity: calc(0.6 + 0.4 * var(--prox, 0));
    transform: translateY(calc(-1.5px * var(--prox, 0)));
    transition: transform 160ms, box-shadow 160ms, background 160ms, opacity 160ms;
  }
  .right .menu { flex-direction: row; }
  .menu::after { /* light sweep that travels across (towards the screen edge) as you get closer */
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(100deg, #fff0 30%, #ffffff1c 50%, #fff0 70%);
    transform: translateX(calc(120% - 240% * var(--prox, 0)));
    transition: transform 160ms;
  }
  .right .menu::after { transform: translateX(calc(-120% + 240% * var(--prox, 0))); }
  .menu:hover { box-shadow: inset 0 1px 0 #ffffff33, inset 0 -1px 0 #00000090, 0 2px 4px #000c; }
  .menu.down {
    background: linear-gradient(170deg, #1a1a1a, #262626);
    box-shadow: inset 0 2px 4px #000d, inset 0 -1px 0 #ffffff12; transform: translateY(1px); opacity: 1;
  }
  .menu.down::after { transform: translateX(-120%); }
  .right .menu.down::after { transform: translateX(120%); }
  .cur { font-size: .7em; opacity: .8; }
  /* phones: the keys have the bar's first row to themselves, so they sit in its middle rather than the bar's,
     and are bigger for thumbs; the right one shows only its icon */
  @media (max-width: 700px) {
    .corner { top: calc(48 * var(--s)); }
    .menu { font-size: calc(36 * var(--s)); padding: calc(10 * var(--s)) calc(18 * var(--s)); }
    .right .cur { display: none; }
  }
  /* the panel lives inside the top bar, so it fades with it; same tone, no border: one L-shaped surface */
  .side {
    --s: clamp(0.5px, 100vw / 1600, 1px);
    position: fixed; top: var(--topbar, 0px); left: 0; bottom: 0; width: min(80vw, calc(340 * var(--s))); box-sizing: border-box;
    display: flex; flex-direction: column; gap: calc(4 * var(--s)); padding: calc(16 * var(--s)) calc(20 * var(--s));
    background: rgba(0, 0, 0, 0.6);
    color: #fff; font-size: calc(24 * var(--s)); letter-spacing: .08em; text-transform: uppercase; user-select: none;
    pointer-events: none; transition: transform 320ms cubic-bezier(.2,.8,.2,1), background 200ms;
  }
  .side.right { left: auto; right: 0; }
  :global(.lit) > .side { background: rgba(0, 0, 0, 0.78); } /* a bit darker while the bar is hovered or a panel is open */
  .side.open { pointer-events: auto; }
  .side :global(button) { all: unset; cursor: pointer; padding: calc(12 * var(--s)) calc(16 * var(--s)); border-radius: 3px; opacity: .7; }
  .side :global(button:hover) { background: #ffffff14; opacity: 1; }
  .side :global(button.on) { opacity: 1; background: #ffffff1c; }
  .side :global(.rule) { height: 1px; background: #fff2; margin: calc(8 * var(--s)) calc(16 * var(--s)); }
  /* phones: bigger type and roomier rows for thumbs */
  @media (max-width: 700px) {
    .side { width: min(80vw, calc(600 * var(--s))); font-size: calc(40 * var(--s)); gap: calc(8 * var(--s)); }
    .side :global(button) { padding: calc(20 * var(--s)) calc(24 * var(--s)); }
  }
</style>
