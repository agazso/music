<script lang="ts">
  import { Spring } from 'svelte/motion';
  import { library, MODES, setMode, type Tile } from './library.svelte';
  import { player } from './player.svelte';
  import { session } from './api.svelte';
  import Side from './Side.svelte';
  import Settings from './Settings.svelte';
  import { bg, importBackground, MATERIALS } from './background.svelte';

  let { tiles, onpick, activeId, hidden }: { tiles: Tile[]; onpick: (t: Tile) => void; activeId?: string; hidden: boolean } = $props();

  // Tile styling from Figma "Frame 2" (3312px wide): 48px gaps, 16px radius, shadows. Sizes are in design
  // units (--u = 100vw / 3312) so they scale with the window; the grid itself is full width.
  let cols = $state(Number(localStorage.getItem('grid.cols')) || 3);
  let gap = $state(Number(localStorage.getItem('grid.gap') ?? 48));
  let art = $state(localStorage.getItem('art') !== '0');
  let motion = $state(localStorage.getItem('motion') === '1'); // off by default
  // which set of controls the top bar shows
  const SETS = { layout: 'Layout', look: 'Look', search: 'Search' } as const;
  let set = $state((localStorage.getItem('set') as keyof typeof SETS) || 'layout');
  $effect(() => {
    localStorage.setItem('grid.cols', String(cols)); localStorage.setItem('grid.gap', String(gap));
    localStorage.setItem('art', art ? '1' : '0'); localStorage.setItem('motion', motion ? '1' : '0');
    localStorage.setItem('set', set);
  });
  // Navidrome >= 0.64 omits coverArt when no image exists, so an empty cover URL means no art
  // the playing album always shows, even without art, so it can be found and scrolled to
  // search set: filter as you type over title and subtitle (artist name for albums)
  let query = $state('');
  let shown = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return tiles.filter((t) => (!art || t.cover || t.id === activeId) && (!q || `${t.title} ${t.sub}`.toLowerCase().includes(q)));
  });
  $effect(() => { library.visible = shown; });

  // when the playing album changes (random queue, next track), bring its cover into view
  // that scroll is not the user's: on touch it must not show or hide the top bar, so it is ignored until the next touch
  let scroller: HTMLDivElement, autoScroll = false;
  $effect(() => {
    if (!activeId) return;
    autoScroll = true;
    requestAnimationFrame(() => scroller?.querySelector('.tile.active')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  });

  // subtle whole-grid drift with the mouse; native scroll does the rest
  const drift = new Spring({ x: 0, y: 0 }, { stiffness: 0.05, damping: 0.5 });
  // top bar visibility. Mouse: 0 below the middle of the screen, 1 at the top edge.
  // Touch: hidden by default; scrolling up shows it, and it stays until scrolling down or tapping an album.
  // media query first; a real touch event also switches to touch mode in case the query misreports
  const touchAtLoad = matchMedia('(hover: none), (pointer: coarse)').matches;
  let touch = $state(touchAtLoad);
  let near = $state(touchAtLoad ? 0 : 1);
  let lastTop = 0;
  function ontouchstart() { autoScroll = false; if (!touch) { touch = true; near = 0; } }
  // on touch, a tap while the bars are hidden only brings them back; it must not start a song
  let wasHidden = false;
  function pick(t: Tile) { if (touch) near = 0; if (touch && wasHidden) return; onpick(t); }
  // the drawer view opened from the right menu, if any; it pins the menu open
  let rightView = $derived(player.viewFrom === 'right' ? player.view : '');
  // two corner keys with side panels: modes on the left, control sets (and share) on the right.
  // top bar and side panels are one piece of chrome: same opacity, and hovering any of them lights all
  let overChrome = $state(false);
  let leftMenu = $state(false), leftOpen = $state(false), rightMenu = $state(false), rightOpen = $state(false);
  let panelOpen = $derived(leftOpen || rightOpen);
  // never fade while the pointer rests on the chrome (touch has no resting pointer, only a stale one), or while a panel is open;
  // on touch idling never hides it, scrolling does
  let barShown = $derived(!!rightView || overChrome || panelOpen || !((!touch && hidden) || player.queueOpen || (!touch && player.topHidden)));
  // published sizes so a drawer can fill exactly the space between top bar, side panel and player bar.
  // on touch the panel never takes space: the drawer spans the full width and the panel opens over it
  let barHeight = $state(0), sideWidth = $state(0);
  $effect(() => { document.documentElement.style.setProperty('--topbar', `${barHeight}px`); });
  $effect(() => { document.documentElement.style.setProperty('--sidebar', `${rightOpen && !touch ? sideWidth : 0}px`); });
  let lit = $derived(overChrome || panelOpen);
  // a menu item opens its view beside the panel, or closes it when it is the one showing. With a mouse the menu stays open;
  // on touch it closes so the view gets the whole width
  function open(view: 'share' | 'settings') { player.viewFrom = 'right'; player.view = rightView === view ? '' : view; rightMenu = !touch; }
  let chrome = $derived(lit ? 1 : near);
  function onmove(e: PointerEvent) {
    drift.target = motion ? { x: (e.clientX / innerWidth) * 2 - 1, y: (e.clientY / innerHeight) * 2 - 1 } : { x: 0, y: 0 };
    if (!touch) near = Math.min(1, Math.max(0, 1 - e.clientY / (innerHeight / 2)));
  }
  function onscroll(e: Event) {
    if (!touch) return;
    const top = (e.currentTarget as HTMLElement).scrollTop;
    if (!autoScroll && Math.abs(top - lastTop) > 4) near = top < lastTop ? 1 : 0;
    lastTop = top;
  }
</script>

<!-- an image dropped anywhere becomes the custom background -->
<svelte:window onpointermove={onmove} {ontouchstart} onpointerdowncapture={() => (wasHidden = hidden)}
  ondragover={(e) => e.preventDefault()} ondrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files[0]; if (f) importBackground(f); }} />

<!-- the material sits on the cards' layer so it scrolls and drifts with them, or on the fixed viewport behind them -->
<div class="scroll" class:fill={!bg.tile} class:m-vinyl={!bg.scroll && bg.material === 'vinyl'} class:m-grille={!bg.scroll && bg.material === 'grille'}
  class:m-fabric={!bg.scroll && bg.material === 'fabric'} class:m-custom={!bg.scroll && bg.material === 'custom'} style:--custom={bg.custom ? `url("${bg.custom}")` : 'none'} {onscroll} bind:this={scroller}>
  <div class="grid" class:m-vinyl={bg.scroll && bg.material === 'vinyl'} class:m-grille={bg.scroll && bg.material === 'grille'}
    class:m-fabric={bg.scroll && bg.material === 'fabric'} class:m-custom={bg.scroll && bg.material === 'custom'} style:--cols={cols} style:--gap="max(0.2px, calc({gap} * var(--u)))"
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
  bind:clientHeight={barHeight} onpointerenter={() => (overChrome = !touch)} onpointerleave={() => (overChrome = false)}>
  {#if set === 'layout'}
    <label>columns <input type="range" min="1" max="10" bind:value={cols} /> {cols}</label>
    <label>gap <input type="range" min="0" max="160" bind:value={gap} /> {gap}</label>
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
        <button class="opt" class:on={bg.material === key} role="radio" aria-checked={bg.material === key} disabled={key === 'custom' && !bg.custom}
          title={key === 'custom' && !bg.custom ? 'import one in settings' : undefined} onclick={() => (bg.material = key as keyof typeof MATERIALS)}>{label}</button>
      {/each}
    </span>
  {/if}
  <!-- left corner: which part of the library the grid shows -->
  <Side side="left" label={library.mode} {touch} bind:menu={leftMenu} bind:open={leftOpen}>
    {#each MODES as m (m)}
      <button role="menuitem" tabindex={leftOpen ? 0 : -1} class:on={library.mode === m} onclick={() => { setMode(m); leftMenu = false; }}>{m}</button>
    {/each}
  </Side>
  <!-- right corner: which set of controls the bar shows, and the share and settings views -->
  <Side side="right" label={SETS[set]} {touch} pinned={!!rightView && !touch} onunpin={() => (player.view = '')} bind:menu={rightMenu} bind:open={rightOpen} bind:width={sideWidth}>
    {#each Object.entries(SETS) as [key, label] (key)}
      <button role="menuitem" tabindex={rightOpen ? 0 : -1} class:on={set === key} onclick={() => { set = key as keyof typeof SETS; player.view = ''; rightMenu = false; }}>{label}</button>
    {/each}
    <span class="rule"></span>
    {#if session.admin}
      <button role="menuitem" tabindex={rightOpen ? 0 : -1} class:on={rightView === 'share'} onclick={() => open('share')}>Share</button>
    {/if}
    <button role="menuitem" tabindex={rightOpen ? 0 : -1} class:on={rightView === 'settings'} onclick={() => open('settings')}>Settings</button>
  </Side>
</div>

{#if library.scan.scanning}<div class="scan">indexing… {library.scan.count} songs</div>{/if}

{#if player.view === 'settings'}<Settings bind:art bind:motion onclose={() => (player.view = '')} />{/if}

<style>
  .scroll {
    --u: calc(100vw / 3312); position: fixed; inset: 0; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: #333 #000; scrollbar-gutter: stable both-edges;
    /* built-in materials: each is grain + a structure + the same two diagonal light bands */
    --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.09 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E") 0 0 / 200px 200px;
    --sheen: repeating-linear-gradient(105deg, #fff0 0, #ffffff0a 160px, #ffffff16 270px, #ffffff0a 380px, #fff0 520px,
        #fff0 780px, #ffffff0a 920px, #ffffff16 1030px, #ffffff0a 1140px, #fff0 1300px, #fff0 1400px);
  }
  .grid { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: var(--gap); padding: var(--gap) var(--gap) 140px; min-height: 100%; box-sizing: border-box; will-change: transform; }
  /* custom: the imported image as authored, repeated at its own size or stretched to cover */
  .m-custom { background: var(--custom) center / auto repeat #000; }
  .fill .m-custom, .fill.m-custom { background-size: cover; background-repeat: no-repeat; }
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
  .controls.lit { background: rgba(0, 0, 0, 0.78); } /* a bit darker while hovered or a panel is open */
  @media (hover: none), (pointer: coarse) { .controls { transition: opacity 450ms, background 200ms; } }
  .controls.hidden { opacity: 0; pointer-events: none; }
  /* phones: the first row holds just the two corner keys, the controls sit in a second row below */
  @media (max-width: 700px) { .controls { padding-top: calc(104 * var(--s)); min-height: calc(192 * var(--s)); } }
  /* scan progress while navidrome indexes the folder (first run, new files) */
  .scan { position: fixed; left: 50%; bottom: 130px; transform: translateX(-50%); padding: 8px 16px; border-radius: 4px;
    background: rgba(0, 0, 0, 0.7); color: #fff; font-size: 14px; letter-spacing: .12em; text-transform: uppercase; pointer-events: none; z-index: 2; }
  .controls label { display: flex; align-items: center; gap: calc(16 * var(--s)); }
  /* look set: a row of labelled options */
  .group { display: flex; align-items: center; gap: calc(10 * var(--s)); }
  .name { margin-right: calc(8 * var(--s)); opacity: .7; }
  .controls .opt { all: unset; cursor: pointer; padding: calc(4 * var(--s)) calc(12 * var(--s)); border: 1px solid #fff5; border-radius: 3px; opacity: .6; }
  .controls .opt:hover { opacity: 1; }
  .controls .opt:disabled { opacity: .25; cursor: default; }
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
  /* same thin slider in every browser; Firefox's default range is large */
  .controls input { appearance: none; width: calc(240 * var(--s)); height: calc(32 * var(--s)); margin: 0; background: none; cursor: pointer; }
  .controls input::-webkit-slider-runnable-track { height: 4px; background: #fff6; }
  .controls input::-moz-range-track { height: 4px; background: #fff6; }
  .controls input::-webkit-slider-thumb { appearance: none; width: calc(24 * var(--s)); height: calc(24 * var(--s));
    margin-top: calc(2px - 12 * var(--s)); border-radius: 50%; background: #fff; }
  .controls input::-moz-range-thumb { width: calc(24 * var(--s)); height: calc(24 * var(--s)); border: 0; border-radius: 50%; background: #fff; }
</style>
