<script lang="ts">
  import { Spring } from 'svelte/motion';
  import type { Tile } from './library.svelte';
  import { player } from './player.svelte';
  import { session } from './api.svelte';

  let { tiles, onpick, activeId, hidden }: { tiles: Tile[]; onpick: (t: Tile) => void; activeId?: string; hidden: boolean } = $props();

  // Tile styling from Figma "Frame 2" (3312px wide): 48px gaps, 16px radius, shadows. Sizes are in design
  // units (--u = 100vw / 3312) so they scale with the window; the grid itself is full width.
  let cols = $state(Number(localStorage.getItem('grid.cols')) || 3);
  let gap = $state(Number(localStorage.getItem('grid.gap') ?? 48));
  let art = $state(localStorage.getItem('art') !== '0');
  let motion = $state(localStorage.getItem('motion') === '1'); // off by default
  // which set of controls the top bar shows, and the background material
  const SETS = { layout: 'Layout', look: 'Look', search: 'Search' } as const;
  const MATERIALS = { vinyl: 'Vinyl', grille: 'Grille', cone: 'Cone', fabric: 'Fabric' } as const;
  let set = $state((localStorage.getItem('set') as keyof typeof SETS) || 'layout');
  let material = $state((localStorage.getItem('material') as keyof typeof MATERIALS) || 'vinyl');
  $effect(() => {
    localStorage.setItem('grid.cols', String(cols)); localStorage.setItem('grid.gap', String(gap));
    localStorage.setItem('art', art ? '1' : '0'); localStorage.setItem('motion', motion ? '1' : '0');
    localStorage.setItem('set', set); localStorage.setItem('material', material);
  });
  // Navidrome >= 0.64 omits coverArt when no image exists, so an empty cover URL means no art
  // the playing album always shows, even without art, so it can be found and scrolled to
  // search set: filter as you type over title and subtitle (artist name for albums)
  let query = $state('');
  let shown = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return tiles.filter((t) => (!art || t.cover || t.id === activeId) && (!q || `${t.title} ${t.sub}`.toLowerCase().includes(q)));
  });

  // when the playing album changes (random queue, next track), bring its cover into view
  let scroller: HTMLDivElement;
  $effect(() => {
    if (!activeId) return;
    requestAnimationFrame(() => scroller?.querySelector('.tile.active')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  });

  // subtle whole-grid drift with the mouse; native scroll does the rest
  const drift = new Spring({ x: 0, y: 0 }, { stiffness: 0.05, damping: 0.5 });
  // top bar visibility. Mouse: 0 below the middle of the screen, 1 at the top edge.
  // Touch: hidden by default; scrolling up fades it in, scrolling down fades it out.
  // media query first; a real touch event also switches to touch mode in case the query misreports
  const touchAtLoad = matchMedia('(hover: none), (pointer: coarse)').matches;
  let touch = $state(touchAtLoad);
  let near = $state(touchAtLoad ? 0 : 1);
  let lastTop = 0;
  function ontouchstart() { if (!touch) { touch = true; near = 0; } }
  // on touch, a tap while the bars are hidden only brings them back; it must not start a song
  let wasHidden = false;
  function pick(t: Tile) { if (touch && wasHidden) return; onpick(t); }
  // hidden while idle, while the song list is open, or after closing it with the handle (mouse only)
  let shareRight = $derived(player.shareOpen && player.shareFrom === 'right');
  // top bar and side panel are one piece of chrome: same opacity, and hovering either lights both
  let overChrome = $state(false), hoverOpen = $state(false), menu = $state(false);
  // after the key closes the panel, hover must not reopen it until the pointer has moved away
  let hoverMuted = false;
  let panelOpen = $derived(menu || hoverOpen || shareRight);
  // never fade while the pointer rests on the top bar or side panel, or while the panel is open
  let barShown = $derived(shareRight || overChrome || panelOpen || !(hidden || player.queueOpen || (!touch && player.topHidden)));
  // published sizes so the share view can fill exactly the space between top bar, side panel and player bar
  let barHeight = $state(0), sideWidth = $state(0);
  $effect(() => { document.documentElement.style.setProperty('--topbar', `${barHeight}px`); });
  $effect(() => { document.documentElement.style.setProperty('--sidebar', `${sideWidth}px`); });
  // side panel: on mouse it peeks as the pointer nears the corner button, opens fully when close by or over
  // the panel, and slides out when the pointer moves away; on touch only the button toggles it
  let corner: HTMLElement, side: HTMLElement;
  let prox = $state(0);
  let lit = $derived(overChrome || panelOpen);
  let chrome = $derived(lit ? 1 : near);
  function onmove(e: PointerEvent) {
    drift.target = motion ? { x: (e.clientX / innerWidth) * 2 - 1, y: (e.clientY / innerHeight) * 2 - 1 } : { x: 0, y: 0 };
    if (touch || !corner) return;
    const r = corner.getBoundingClientRect();
    const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    prox = Math.min(1, Math.max(0, 1 - d / 220));
    const p = side.getBoundingClientRect();
    const overPanel = hoverOpen && e.clientX >= p.left - 8 && e.clientY >= p.top;
    const close = d < 90 || overPanel;
    if (!close) hoverMuted = false;
    hoverOpen = close && !hoverMuted;
    if (!touch) near = Math.min(1, Math.max(0, 1 - e.clientY / (innerHeight / 2)));
  }
  function onscroll(e: Event) {
    if (!touch) return;
    const top = (e.currentTarget as HTMLElement).scrollTop;
    if (Math.abs(top - lastTop) > 4) near = top < lastTop ? 1 : 0;
    lastTop = top;
  }
</script>

<svelte:document onmouseleave={() => { prox = 0; hoverOpen = false; }} />
<svelte:window onpointermove={onmove} {ontouchstart} onpointerdowncapture={() => (wasHidden = hidden)}
  onclick={(e) => { if (menu && !shareRight && !(e.target as Element).closest('.corner, .side, .panel')) menu = false; }} /> <!-- .panel: closing the share view with its chevron keeps the menu open -->

<div class="scroll" {onscroll} bind:this={scroller}>
  <div class="grid m-{material}" style:--cols={cols} style:--gap="max(0.2px, calc({gap} * var(--u)))"
    style:transform="translate3d({drift.current.x * -8}px, {drift.current.y * -6}px, 0)">
    {#each shown as t (t.id)}
      <button class="tile" class:active={t.id === activeId} onclick={() => pick(t)} aria-label="{t.title} — {t.sub}">
        <img src={t.cover} alt={t.title} loading="lazy" draggable="false" />
        <i></i>
      </button>
    {/each}
  </div>
</div>

<div class="controls" role="toolbar" tabindex="-1" aria-label="Controls" class:hidden={!barShown} class:lit style:--chrome={chrome} style:pointer-events={barShown && chrome > 0.05 ? 'auto' : 'none'}
  bind:clientHeight={barHeight} onpointerenter={() => (overChrome = true)} onpointerleave={() => (overChrome = false)}>
  {#if set === 'layout'}
    <label>columns <input type="range" min="1" max="10" bind:value={cols} /> {cols}</label>
    <label>gap <input type="range" min="0" max="160" bind:value={gap} /> {gap}</label>
    <label><input type="checkbox" bind:checked={art} /> with art</label>
    <label><input type="checkbox" bind:checked={motion} /> motion</label>
  {:else if set === 'search'}
    <span class="find">
      <input type="text" placeholder="search" bind:value={query} spellcheck="false" autocomplete="off" aria-label="Search"
        onkeydown={(e) => { if (e.key === 'Escape') query = ''; }} {@attach (el) => el.focus()} />
      {#if query}
        <button class="clear" onclick={() => (query = '')} aria-label="Clear search">
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      {/if}
    </span>
  {:else}
    <span class="group" role="radiogroup" aria-label="Background">
      <span class="name">background</span>
      {#each Object.entries(MATERIALS) as [key, label] (key)}
        <button class="opt" class:on={material === key} role="radio" aria-checked={material === key} onclick={() => (material = key as keyof typeof MATERIALS)}>{label}</button>
      {/each}
    </span>
  {/if}
  <!-- corner selector: which set of controls the bar shows; while the panel is open for any reason (menu, hover, share)
       a press closes it all, so the depressed key always works as a close key on touch -->
  <span class="corner" bind:this={corner}>
    <button class="menu" class:down={panelOpen} style:--prox={prox.toFixed(2)} onclick={() => { if (shareRight) player.shareOpen = false; menu = !panelOpen; hoverMuted = !menu; hoverOpen = false; }} aria-haspopup="menu" aria-expanded={panelOpen} aria-label="Control sets">
      <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      <span class="cur">{SETS[set]}</span>
    </button>
  </span>
</div>

<!-- side panel: continues the top bar downward from its right end; hidden fully off-screen, peeks as the pointer
     approaches the corner button, opens on hover nearby (mouse) or from the button (touch) -->
<div class="side" class:open={panelOpen} class:hidden={!barShown} class:lit role="menu" aria-hidden={!panelOpen} bind:this={side} bind:clientWidth={sideWidth}
  style:--chrome={chrome} style:transform={panelOpen ? 'translateX(0)' : `translateX(calc(100% - ${(prox * 12).toFixed(1)}px))`}
  onpointerenter={() => (overChrome = true)} onpointerleave={() => (overChrome = false)}>
  {#each Object.entries(SETS) as [key, label] (key)}
    <button role="menuitem" tabindex={panelOpen ? 0 : -1} class:on={set === key} onclick={() => { set = key as keyof typeof SETS; if (shareRight) player.shareOpen = false; menu = false; }}>{label}</button>
  {/each}
  {#if session.admin}
    <span class="rule"></span>
    <button role="menuitem" tabindex={panelOpen ? 0 : -1} class:on={shareRight} onclick={() => { player.shareFrom = 'right'; player.shareOpen = !shareRight; menu = true; }}>Share</button>
  {/if}
</div>

<style>
  .scroll { --u: calc(100vw / 3312); position: fixed; inset: 0; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: #333 #000; scrollbar-gutter: stable both-edges; }
  .grid {
    display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: var(--gap);
    padding: var(--gap) var(--gap) 140px; min-height: 100%; box-sizing: border-box; will-change: transform;
    /* materials scroll and drift with the cards; each is grain + a structure + the same two diagonal light bands */
    --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.09 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E") 0 0 / 200px 200px;
    --sheen: repeating-linear-gradient(105deg, #fff0 0, #ffffff0a 160px, #ffffff16 270px, #ffffff0a 380px, #fff0 520px,
        #fff0 780px, #ffffff0a 920px, #ffffff16 1030px, #ffffff0a 1140px, #fff0 1300px, #fff0 1400px);
  }
  /* vinyl: pressed hairline grooves */
  .m-vinyl { background: var(--grain), repeating-linear-gradient(to bottom, #fff0 0 2px, #00000033 2px 3px, #ffffff06 3px 4px), var(--sheen); }
  /* grille: perforated gunmetal, staggered round holes with a lit top edge, brushed base */
  .m-grille {
    background:
      var(--grain),
      radial-gradient(circle at 50% 50%, #000 0 2px, #ffffff10 2.3px 2.7px, #0000 3px) 0 0 / 9px 15.6px,
      radial-gradient(circle at 50% 50%, #000 0 2px, #ffffff10 2.3px 2.7px, #0000 3px) 4.5px 7.8px / 9px 15.6px,
      repeating-linear-gradient(to right, #ffffff05 0 1px, #0000 1px 3px),
      var(--sheen),
      linear-gradient(#1c1c1c, #151515);
  }
  /* cone: soft matte ridges (rounded ripples), no hard lines */
  .m-cone {
    background:
      var(--grain),
      repeating-linear-gradient(to bottom, #ffffff09 0, #ffffff03 6px, #0000 12px, #00000040 20px, #0000 26px, #ffffff09 28px),
      var(--sheen),
      linear-gradient(#111, #0b0b0b);
  }
  /* fabric: fine crosshatch weave with a soft nap */
  .m-fabric {
    background:
      var(--grain),
      repeating-linear-gradient(45deg, #ffffff07 0 1px, #0000 1px 4px),
      repeating-linear-gradient(-45deg, #ffffff07 0 1px, #0000 1px 4px),
      repeating-linear-gradient(to bottom, #00000030 0 1px, #0000 1px 4px),
      var(--sheen),
      linear-gradient(#141414, #0e0e0e);
  }
  .tile {
    all: unset; position: relative; cursor: pointer; aspect-ratio: 1; background: #111;
    border-radius: 1px; overflow: hidden;
    box-shadow: 0 3px 5px -2px rgba(0, 0, 0, 0.8); /* light from top: shadow below only */
    transition: transform 200ms cubic-bezier(.2,.8,.2,1), box-shadow 200ms;
  }
  /* alt text stays for screen readers but is not painted in the browser's default style when a cover fails */
  .tile img { width: 100%; height: 100%; object-fit: cover; display: block; user-select: none; color: transparent; font-size: 0; }
  /* glossy vinyl-paper sleeve: paper grain, a broad laminate reflection with a faint second band,
     faint lit top-left edge and shaded bottom-right edge */
  .tile i { position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E") 0 0 / 160px 160px,
      linear-gradient(115deg, #fff0 0%, #fff0 18%, rgba(255, 255, 255, 0.11) 30%, rgba(255, 255, 255, 0.04) 42%, #fff0 50%,
        #fff0 62%, rgba(255, 255, 255, 0.06) 70%, #fff0 78%),
      linear-gradient(165deg, rgba(255, 255, 255, 0.10) 0%, #fff0 40%, rgba(0, 0, 0, 0.10) 100%);
    box-shadow:
      inset 1px 1px 0 rgba(255, 255, 255, 0.07),
      inset -1px -1px 0 rgba(0, 0, 0, 0.2);
    transition: opacity 200ms; }
  .tile:hover, .tile:focus-visible { z-index: 1;
    box-shadow: 0 6px 8px -3px rgba(0, 0, 0, 0.85); }
  .tile:hover i { opacity: .7; }
  .tile.active { box-shadow: 0 0 0 2px #fff, 0 0 50px #fff5; }
  .controls {
    /* sizes scale with the viewport between phone and desktop */
    --s: clamp(0.5px, 100vw / 1600, 1px);
    /* one fixed height for every control set so switching never jumps; --bar-rows scales it (2, 3 …) later */
    --bar-rows: 1;
    position: fixed; top: 0; left: 0; right: 0; box-sizing: border-box; min-height: calc(96 * var(--s) * var(--bar-rows));
    display: flex; flex-wrap: wrap; justify-content: center; align-items: center; align-content: center;
    gap: calc(12 * var(--s)) calc(36 * var(--s));
    color: #fff; font-size: calc(24 * var(--s));
    padding: calc(8 * var(--s)) calc(20 * var(--s)); background: rgba(0, 0, 0, 0.6);
    letter-spacing: .08em; text-transform: uppercase; opacity: var(--chrome, 1); user-select: none;
    transition: opacity 150ms, background 200ms; z-index: 2;
  }
  .controls.lit, .side.lit { background: rgba(0, 0, 0, 0.78); } /* a bit darker while hovered or the panel is open */
  @media (hover: none), (pointer: coarse) { .controls { transition: opacity 450ms, background 200ms; } }
  .controls.hidden { opacity: 0; pointer-events: none; }
  .controls label { display: flex; align-items: center; gap: calc(16 * var(--s)); }
  /* look set: a row of labelled options */
  .group { display: flex; align-items: center; gap: calc(10 * var(--s)); }
  .name { margin-right: calc(8 * var(--s)); opacity: .7; }
  .controls .opt { all: unset; cursor: pointer; padding: calc(4 * var(--s)) calc(12 * var(--s)); border: 1px solid #fff5; border-radius: 3px; opacity: .6; }
  .controls .opt:hover { opacity: 1; }
  .controls .opt.on { opacity: 1; background: #fff; color: #000; border-color: #fff; }
  /* search set: bare underlined field with a white caret; the clear key appears once there is text */
  .find { position: relative; display: flex; align-items: center; }
  .controls input[type=text] {
    width: calc(420 * var(--s)); height: auto; padding: calc(6 * var(--s)) calc(36 * var(--s)) calc(6 * var(--s)) 0;
    border: 0; border-bottom: 1px solid #fff6; border-radius: 0; background: none; color: #fff; caret-color: #fff;
    font: inherit; letter-spacing: inherit; text-transform: none; outline: none; cursor: text; transition: border-color 150ms;
  }
  .controls input[type=text]:focus { border-bottom-color: #fff; }
  .controls input[type=text]::placeholder { color: #fff6; text-transform: uppercase; }
  .controls .clear { all: unset; cursor: pointer; position: absolute; right: 0; display: flex; padding: calc(6 * var(--s)); opacity: .6; }
  .controls .clear:hover { opacity: 1; }
  /* corner selector */
  .corner { position: absolute; right: calc(20 * var(--s)); top: 50%; transform: translateY(-50%); }
  /* corner button: subtle brushed-metal key. It lifts and brightens as the pointer approaches (--prox 0…1)
     and sits pressed in while the panel is open */
  .controls .menu {
    all: unset; cursor: pointer; position: relative; overflow: hidden; display: flex; align-items: center; gap: calc(8 * var(--s));
    padding: calc(6 * var(--s)) calc(12 * var(--s)); border-radius: 4px; border: 1px solid #000;
    background: linear-gradient(170deg, #3b3b3b, #232323 55%, #2b2b2b);
    box-shadow: inset 0 1px 0 #ffffff26, inset 0 -1px 0 #00000090, 0 1px 2px #000b;
    opacity: calc(0.6 + 0.4 * var(--prox, 0));
    transform: translateY(calc(-1.5px * var(--prox, 0)));
    transition: transform 160ms, box-shadow 160ms, background 160ms, opacity 160ms;
  }
  .controls .menu::after { /* light sweep that travels across as you get closer */
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(100deg, #fff0 30%, #ffffff1c 50%, #fff0 70%);
    transform: translateX(calc(-120% + 240% * var(--prox, 0)));
    transition: transform 160ms;
  }
  .controls .menu:hover { box-shadow: inset 0 1px 0 #ffffff33, inset 0 -1px 0 #00000090, 0 2px 4px #000c; }
  .controls .menu.down {
    background: linear-gradient(170deg, #1a1a1a, #262626);
    box-shadow: inset 0 2px 4px #000d, inset 0 -1px 0 #ffffff12; transform: translateY(1px); opacity: 1;
  }
  .controls .menu.down::after { transform: translateX(120%); }
  .cur { font-size: .7em; opacity: .8; }
  .side {
    --s: clamp(0.5px, 100vw / 1600, 1px);
    position: fixed; top: var(--topbar, 0px); right: 0; bottom: 0; width: min(80vw, calc(340 * var(--s))); box-sizing: border-box;
    display: flex; flex-direction: column; gap: calc(4 * var(--s)); padding: calc(16 * var(--s)) calc(20 * var(--s));
    background: rgba(0, 0, 0, 0.6); z-index: 2; /* same tone and layer as the top bar, no border: one L-shaped surface */
    color: #fff; font-size: calc(24 * var(--s)); letter-spacing: .08em; text-transform: uppercase; opacity: var(--chrome, 1); user-select: none;
    pointer-events: none; transition: transform 320ms cubic-bezier(.2,.8,.2,1), opacity 150ms, background 200ms;
  }
  .side.open { pointer-events: auto; }
  .side.hidden { opacity: 0; }
  .side button { all: unset; cursor: pointer; padding: calc(12 * var(--s)) calc(16 * var(--s)); border-radius: 3px; opacity: .7; }
  .side button:hover { background: #ffffff14; opacity: 1; }
  .side button.on { opacity: 1; background: #ffffff1c; }
  .side .rule { height: 1px; background: #fff2; margin: calc(8 * var(--s)) calc(16 * var(--s)); }
  /* same thin slider in every browser; Firefox's default range is large */
  .controls input { appearance: none; width: calc(240 * var(--s)); height: calc(32 * var(--s)); margin: 0; background: none; cursor: pointer; }
  .controls input[type=checkbox] { width: calc(24 * var(--s)); height: calc(24 * var(--s)); border: 2px solid #fff9; border-radius: 50%; }
  .controls input[type=checkbox]:checked { background: #fff; }
  .controls input::-webkit-slider-runnable-track { height: 4px; background: #fff6; }
  .controls input::-moz-range-track { height: 4px; background: #fff6; }
  .controls input::-webkit-slider-thumb { appearance: none; width: calc(24 * var(--s)); height: calc(24 * var(--s));
    margin-top: calc(2px - 12 * var(--s)); border-radius: 50%; background: #fff; }
  .controls input::-moz-range-thumb { width: calc(24 * var(--s)); height: calc(24 * var(--s)); border: 0; border-radius: 50%; background: #fff; }
</style>
