<script lang="ts">
  import { Spring } from 'svelte/motion';
  import type { Tile } from './library.svelte';
  import { player } from './player.svelte';

  let { tiles, onpick, activeId, hidden }: { tiles: Tile[]; onpick: (t: Tile) => void; activeId?: string; hidden: boolean } = $props();

  // Tile styling from Figma "Frame 2" (3312px wide): 48px gaps, 16px radius, shadows. Sizes are in design
  // units (--u = 100vw / 3312) so they scale with the window; the grid itself is full width.
  let cols = $state(Number(localStorage.getItem('grid.cols')) || 3);
  let gap = $state(Number(localStorage.getItem('grid.gap') ?? 48));
  let art = $state(localStorage.getItem('art') !== '0');
  let motion = $state(localStorage.getItem('motion') === '1'); // off by default
  $effect(() => { localStorage.setItem('grid.cols', String(cols)); localStorage.setItem('grid.gap', String(gap)); localStorage.setItem('art', art ? '1' : '0'); localStorage.setItem('motion', motion ? '1' : '0'); });
  // Navidrome >= 0.64 omits coverArt when no image exists, so an empty cover URL means no art
  let shown = $derived(art ? tiles.filter((t) => t.cover) : tiles);

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
  let barShown = $derived(!(hidden || player.queueOpen || (!touch && player.topHidden)));
  function onmove(e: PointerEvent) {
    drift.target = motion ? { x: (e.clientX / innerWidth) * 2 - 1, y: (e.clientY / innerHeight) * 2 - 1 } : { x: 0, y: 0 };
    if (!touch) near = Math.min(1, Math.max(0, 1 - e.clientY / (innerHeight / 2)));
  }
  function onscroll(e: Event) {
    if (!touch) return;
    const top = (e.currentTarget as HTMLElement).scrollTop;
    if (Math.abs(top - lastTop) > 4) near = top < lastTop ? 1 : 0;
    lastTop = top;
  }
</script>

<svelte:window onpointermove={onmove} {ontouchstart} onpointerdowncapture={() => (wasHidden = hidden)} />

<div class="scroll" {onscroll}>
  <div class="grid" style:--cols={cols} style:--gap="max(0.2px, calc({gap} * var(--u)))"
    style:transform="translate3d({drift.current.x * -8}px, {drift.current.y * -6}px, 0)">
    {#each shown as t (t.id)}
      <button class="tile" class:active={t.id === activeId} onclick={() => pick(t)} title="{t.title} — {t.sub}">
        <img src={t.cover} alt={t.title} loading="lazy" draggable="false" />
        <i></i>
      </button>
    {/each}
  </div>
</div>

<div class="controls" class:hidden={!barShown} style:--near={near} style:pointer-events={barShown && near > 0.05 ? 'auto' : 'none'}>
  <label>columns <input type="range" min="1" max="10" bind:value={cols} /> {cols}</label>
  <label>gap <input type="range" min="0" max="160" bind:value={gap} /> {gap}</label>
  <label><input type="checkbox" bind:checked={art} /> with art</label>
  <label><input type="checkbox" bind:checked={motion} /> motion</label>
</div>

<style>
  .scroll { --u: calc(100vw / 3312); position: fixed; inset: 0; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: #333 #000; scrollbar-gutter: stable both-edges; }
  .grid {
    display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: var(--gap);
    padding: var(--gap) var(--gap) 140px; min-height: 100%; box-sizing: border-box; will-change: transform;
    /* vinyl material, scrolls and drifts with the cards: fine grain, pressed hairline grooves, two diagonal light bands (seamless repeat) */
    background:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.09 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E") 0 0 / 200px 200px,
      repeating-linear-gradient(to bottom, #fff0 0 2px, #00000033 2px 3px, #ffffff06 3px 4px),
      repeating-linear-gradient(105deg, #fff0 0, #ffffff0a 160px, #ffffff16 270px, #ffffff0a 380px, #fff0 520px,
        #fff0 780px, #ffffff0a 920px, #ffffff16 1030px, #ffffff0a 1140px, #fff0 1300px, #fff0 1400px);
  }
  .tile {
    all: unset; position: relative; cursor: pointer; aspect-ratio: 1; background: #111;
    border-radius: 1px; overflow: hidden;
    box-shadow: 0 3px 5px -2px rgba(0, 0, 0, 0.8); /* light from top: shadow below only */
    transition: transform 200ms cubic-bezier(.2,.8,.2,1), box-shadow 200ms;
  }
  .tile img { width: 100%; height: 100%; object-fit: cover; display: block; user-select: none; }
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
    position: fixed; top: 0; left: 0; right: 0; box-sizing: border-box;
    display: flex; flex-wrap: wrap; justify-content: center; gap: calc(12 * var(--s)) calc(36 * var(--s));
    color: #fff; font-size: calc(24 * var(--s));
    padding: calc(28 * var(--s)) calc(20 * var(--s)); background: rgba(0, 0, 0, 0.6);
    letter-spacing: .08em; text-transform: uppercase; opacity: var(--near, 1); transition: opacity 150ms; z-index: 2;
  }
  .controls:hover { opacity: 1; background: rgba(0, 0, 0, 0.6); }
  @media (hover: none) { .controls { opacity: 1; background: rgba(0, 0, 0, 0.6); } .controls.hidden { opacity: 0; pointer-events: none; } }
  .controls.hidden { opacity: 0; pointer-events: none; }
  .controls label { display: flex; align-items: center; gap: calc(16 * var(--s)); }
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
