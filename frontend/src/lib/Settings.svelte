<script lang="ts">
  import Drawer from './Drawer.svelte';
  import { session } from './api.svelte';
  import { bg, clearBackground, importBackground } from './background.svelte';

  let { art = $bindable(), motion = $bindable(), onclose }: { art: boolean; motion: boolean; onclose: () => void } = $props();
  let paste = $state(''), bad = $state(false);
  // a picked file, or SVG / CSS pasted from a generator (fffuel's "copy SVG" or eeencode output)
  async function load(src: File | string) { bad = !(await importBackground(src)); if (!bad) paste = ''; }
</script>

<Drawer from="right" {onclose}>
  <div class="body">
    <section>
      <h2>appearance</h2>
      <label><input type="checkbox" bind:checked={art} /> with art</label>
      <label><input type="checkbox" bind:checked={motion} /> motion</label>
      <label><input type="checkbox" bind:checked={bg.scroll} /> background scrolls with the cards</label>
      <label><input type="checkbox" bind:checked={bg.tile} disabled={bg.material !== 'custom'} /> tile the custom background</label>
      <p class="import">
        <span class="k">custom background</span>
        <label class="btn"><input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" onchange={(e) => { const f = e.currentTarget.files?.[0]; if (f) load(f); e.currentTarget.value = ''; }} />choose file</label>
        <input type="text" placeholder="or paste svg / css" bind:value={paste} spellcheck="false" onchange={() => paste.trim() && load(paste)} />
        {#if bg.custom}<button class="btn" onclick={clearBackground}>clear</button>{/if}
        {#if bad}<span class="err">not an svg, png or jpeg</span>{/if}
      </p>
    </section>
    <section>
      <h2>network</h2>
      <p><span class="k">server</span> <span class="v">{session.base}</span></p>
    </section>
  </div>
</Drawer>

<style>
  .body {
    flex: 1; min-width: 0; overflow-y: auto; padding: calc(40 * var(--s)) calc(56 * var(--s)); scrollbar-width: thin; scrollbar-color: #333 #0000;
    display: flex; flex-direction: column; gap: calc(40 * var(--s));
    font-size: calc(22 * var(--s)); letter-spacing: .08em; text-transform: uppercase; user-select: none;
  }
  h2 { margin: 0 0 calc(12 * var(--s)); font-size: .75em; font-weight: 500; opacity: .5; }
  label { display: flex; align-items: center; gap: calc(16 * var(--s)); padding: calc(10 * var(--s)) 0; cursor: pointer; }
  /* same round toggle as the top bar's */
  input { appearance: none; margin: 0; width: calc(24 * var(--s)); height: calc(24 * var(--s)); border: 2px solid #fff9; border-radius: 50%; cursor: pointer; }
  input:checked { background: #fff; }
  p { margin: 0; padding: calc(10 * var(--s)) 0; display: flex; gap: calc(24 * var(--s)); align-items: center; flex-wrap: wrap; }
  .btn { all: unset; display: inline-block; padding: calc(4 * var(--s)) calc(12 * var(--s)); border: 1px solid #fff5; border-radius: 3px; opacity: .6; cursor: pointer; }
  .btn:hover { opacity: 1; }
  .btn input[type=file] { display: none; }
  input[type=text] {
    appearance: none; width: calc(320 * var(--s)); margin: 0; padding: calc(4 * var(--s)) 0; border: 0; border-bottom: 1px solid #fff6; border-radius: 0; background: none; color: #fff;
    font: inherit; letter-spacing: inherit; text-transform: none; outline: none; caret-color: #fff;
  }
  input[type=text]::placeholder { color: #fff6; text-transform: uppercase; }
  input:disabled, label:has(input:disabled) { opacity: .4; cursor: default; }
  .err { color: #f88; opacity: .8; }
  .k { opacity: .5; }
  .v { text-transform: none; letter-spacing: .02em; user-select: text; overflow-wrap: anywhere; }
</style>
