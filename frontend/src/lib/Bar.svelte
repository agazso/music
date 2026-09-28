<script lang="ts">
  import { coverUrl, session } from './api.svelte';
  import { jumpRandom, player, seek, setOrder, toggle, type Order } from './player.svelte';
  import { grid } from './library.svelte';
  import Queue from './Queue.svelte';
  import Share from './Share.svelte';
  let { hidden }: { hidden: boolean } = $props();
  // publish the bar height so the song list can pad for it
  let barHeight = $state(0);
  $effect(() => { document.documentElement.style.setProperty('--botbar', `${barHeight}px`); });
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  // random picks songs from the albums the grid shows
  // icons after VLC's: an arrow into a stop bar for in order, crossing arrows for shuffle; a die for random, which VLC lacks
  const ORDERS: Record<Order, string> = { normal: 'In order', shuffle: 'Shuffle album', random: 'Random from the grid' };
  // the bottom-right menu: share, visualizer and play order. It stays open until closed like the song list
  let menu = $state(false), key: HTMLElement, panel: HTMLElement;
  // hot corners: the pointer pushed into a bottom screen corner opens what that corner holds, which then stays until closed:
  // the song list on the left (only with a song loaded, like the button it stands in for), the menu on the right.
  // mouse only, and only while the bar shows
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  function atCorner(e: MouseEvent, slack: number) {
    if (touch || hidden || e.clientY < innerHeight - slack) return '';
    return e.clientX <= slack ? (player.song ? 'left' : '') : e.clientX >= innerWidth - slack ? 'right' : '';
  }
  function openCorner(c: string) { if (c === 'left') player.queueOpen = true; if (c === 'right') menu = true; }
  // only entering the corner opens it: a pointer resting there must not reopen it the moment it is closed
  // (Chrome sends a synthetic move when the layout under the pointer changes)
  let inCorner = '';
  function onmove(e: PointerEvent) { const now = atCorner(e, 2); if (now !== inCorner) openCorner(now); inCorner = now; }
  function onclick(e: MouseEvent) { const t = e.target as Node; if (menu && !key?.contains(t) && !panel?.contains(t)) menu = false; }
  // a menu item that opens a view hands the screen to it
  function share() { player.viewFrom = 'bottom'; player.view = player.view === 'share' ? '' : 'share'; menu = false; }
  function visualize() { player.visOpen = true; menu = false; }
</script>

<!-- the pointer leaves a frameless window through a corner, so the leave event counts too, with more slack -->
<svelte:window onpointermove={onmove} {onclick} />
<svelte:document onmouseleave={(e) => openCorner(atCorner(e, 24))} />

{#if session.api}
  {#if player.queueOpen}<Queue onclose={() => (player.queueOpen = false)} />{/if}
  {#if player.view === 'share'}<Share from={player.viewFrom} onclose={() => (player.view = '')} />{/if}
  <div class="menu-panel" class:open={menu} role="menu" aria-hidden={!menu} bind:this={panel}>
    {#if session.admin}<button role="menuitem" tabindex={menu ? 0 : -1} class:on={player.view === 'share'} onclick={share}>Share</button>{/if}
    <button role="menuitem" tabindex={menu ? 0 : -1} onclick={visualize}>Visualizer</button>
    <span class="rule"></span>
    <!-- stays open after a jump, so it can be pressed again right away -->
    <button role="menuitem" tabindex={menu ? 0 : -1} onclick={() => jumpRandom(grid)}>Shuffle</button>
    <span class="orders" role="radiogroup" aria-label="Play order">
      {#each Object.entries(ORDERS) as [o, label] (o)}
        <button role="radio" tabindex={menu ? 0 : -1} aria-checked={player.order === o} aria-label={label} title={label} class:on={player.order === o} onclick={() => setOrder(o as Order, grid)}>
          <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            {#if o === 'normal'}<path d="M3 12h13M12 8l4 4-4 4M20 6v12" />
            {:else if o === 'shuffle'}<path d="M3 7h2.5c5.5 0 7.5 10 13 10H21M3 17h2.5c2.3 0 3.9-1.8 5.2-4M13.3 11c1.3-2.2 2.9-4 5.2-4H21M18 4l3 3-3 3M18 14l3 3-3 3" />
            {:else}<rect x="4" y="4" width="16" height="16" rx="3" />
              {#each [[8.5, 8.5], [15.5, 8.5], [12, 12], [8.5, 15.5], [15.5, 15.5]] as [cx, cy] (`${cx}${cy}`)}<circle {cx} {cy} r="1.1" fill="currentColor" stroke="none" />{/each}
            {/if}
          </svg>
        </button>
      {/each}
    </span>
  </div>
  <div class="bar" class:hidden={hidden && !player.queueOpen && !player.view && !menu} class:lit={player.queueOpen || !!player.view || menu} bind:clientHeight={barHeight}>
    {#if player.song}
      <!-- cover + title + artist: one control that opens the song list -->
      <button class="left" onclick={() => (player.queueOpen = !player.queueOpen)} aria-label="Show songs" aria-expanded={player.queueOpen}>
        <img src={coverUrl(player.song.coverArt, 96)} alt="" />
        <span class="meta"><b>{player.song.title}</b> <span>{player.song.artist}</span></span>
      </button>
    {:else}
      <span class="left"></span>
    {/if}
    <span class="ctl">
      <span class="btns">
        <button onclick={toggle} disabled={!player.song} aria-label={player.playing ? 'Pause' : 'Play'}>{player.playing ? '❚❚' : '▶'}</button>
      </span>
      <span class="time">{fmt(player.time)} / {fmt(player.duration)}</span>
    </span>
    <!-- reaches the screen edge so a click in the corner itself opens the menu, like the song list on the left -->
    <button class="key" class:down={menu} bind:this={key} onclick={() => (menu = !menu)} aria-haspopup="menu" aria-expanded={menu} aria-label="Menu">
      <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    </button>
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
    background: rgba(0, 0, 0, 0.6); transition: opacity 600ms, background 200ms; z-index: 2; /* same tone as top bar and side panel */
  }
  .bar:hover, .bar.lit { background: rgba(0, 0, 0, 0.78); } /* darker while hovered or an overlay is open, like the panels */
  .bar.hidden:not(:hover) { opacity: 0; pointer-events: none; } /* stays visible while the mouse rests on it */
  /* .bar .left outranks the generic .bar button reset below, so it keeps filling the middle;
     it reaches the screen edge so a click in the corner itself opens the list */
  .bar .left {
    all: unset; flex: 1; min-width: 0; display: flex; align-items: center; gap: calc(12 * var(--s));
    align-self: stretch; padding: 0 calc(8 * var(--s)) 0 calc(16 * var(--s)); margin-left: calc(-16 * var(--s)); border-radius: 0 3px 3px 0;
    font-size: calc(20 * var(--s)); transition: background 150ms, opacity 100ms;
  }
  .bar button.left { cursor: pointer; }
  .bar button.left:hover { background: rgba(255, 255, 255, 0.06); }
  .bar button.left:active { background: rgba(255, 255, 255, 0.03); opacity: .8; }
  .bar img { width: calc(56 * var(--s)); height: calc(56 * var(--s)); object-fit: cover; opacity: .95; flex-shrink: 0; }
  .meta { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta b { font-weight: 500; color: #fff; }
  .meta span { opacity: .7; margin-left: 8px; }
  .bar button { all: unset; cursor: pointer; font-size: calc(20 * var(--s)); padding: 4px 12px; opacity: .9; }
  .bar button:disabled { opacity: .3; cursor: default; }
  .bar .key {
    display: flex; align-items: center; align-self: stretch; padding: 0 calc(16 * var(--s)) 0 calc(12 * var(--s)); margin-right: calc(-16 * var(--s));
    border-radius: 3px 0 0 3px; opacity: .7; transition: background 150ms, opacity 100ms;
  }
  .bar .key:hover, .bar .key.down { opacity: 1; background: rgba(255, 255, 255, 0.06); }
  /* the menu: same width, tone and type as the top-right panel, as tall as its items, sitting on the bar's right end */
  .menu-panel {
    --s: clamp(0.5px, 100vw / 1600, 1px);
    position: fixed; right: 0; bottom: var(--botbar, 0px); width: min(80vw, calc(340 * var(--s))); box-sizing: border-box;
    display: flex; flex-direction: column; gap: calc(4 * var(--s)); padding: calc(16 * var(--s)) calc(20 * var(--s));
    background: rgba(0, 0, 0, 0.78); color: #fff; font-size: calc(24 * var(--s)); letter-spacing: .08em; text-transform: uppercase; user-select: none;
    transform: translateX(100%); pointer-events: none; transition: transform 320ms cubic-bezier(.2,.8,.2,1); z-index: 2;
  }
  .menu-panel.open { transform: translateX(0); pointer-events: auto; }
  .menu-panel button { all: unset; cursor: pointer; padding: calc(12 * var(--s)) calc(16 * var(--s)); border-radius: 3px; opacity: .7; }
  .menu-panel button:hover { background: #ffffff14; opacity: 1; }
  .menu-panel button.on { opacity: 1; background: #ffffff1c; }
  .rule { height: 1px; background: #fff2; margin: calc(8 * var(--s)) calc(16 * var(--s)); }
  /* play order: one row of equal options, the chosen one solid like the top bar's */
  .orders { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(8 * var(--s)); padding: calc(4 * var(--s)) 0; }
  .menu-panel .orders button { display: flex; justify-content: center; padding: calc(8 * var(--s)) 0; border: 1px solid #fff5; }
  .menu-panel .orders button.on { background: #fff; color: #000; border-color: #fff; }
  @media (max-width: 700px) {
    .menu-panel { width: min(80vw, calc(600 * var(--s))); font-size: calc(40 * var(--s)); gap: calc(8 * var(--s)); }
    .menu-panel button { padding: calc(20 * var(--s)) calc(24 * var(--s)); }
  }
  .ctl { display: flex; flex-direction: column; align-items: center; gap: 0; flex-shrink: 0; }
  .btns { display: flex; align-items: center; }
  .btns svg { display: block; }
  .time { opacity: .7; font-size: .7em; font-variant-numeric: tabular-nums; }
  /* phones: let title/artist take two lines */
  @media (max-width: 700px) {
    .meta { white-space: normal; display: flex; flex-direction: column; line-height: 1.2; }
    .meta b, .meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .meta span { margin-left: 0; }
  }
  /* the seek line is 2px, but the hit area is 18px tall straddling the bar's top edge (touch and mouse slop);
     hovering thickens the line */
  .progress { --h: 2px; position: absolute; left: 0; right: 0; top: -9px; height: 18px; cursor: pointer; z-index: 1; }
  .progress::before { content: ''; position: absolute; left: 0; right: 0; top: 9px; height: var(--h); background: #ffffff0a; transition: height 120ms; }
  .progress i { position: absolute; left: 0; top: 9px; height: var(--h); background: #fff5; transition: height 120ms, background 120ms; }
  .progress:hover { --h: 6px; }
  .progress:hover i { background: #fff9; }
</style>
