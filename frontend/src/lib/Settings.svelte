<script lang="ts">
  import Drawer from './Drawer.svelte';
  import { session } from './api.svelte';

  let { art = $bindable(), motion = $bindable(), onclose }: { art: boolean; motion: boolean; onclose: () => void } = $props();
</script>

<Drawer from="right" {onclose}>
  <div class="body">
    <section>
      <h2>appearance</h2>
      <label><input type="checkbox" bind:checked={art} /> with art</label>
      <label><input type="checkbox" bind:checked={motion} /> motion</label>
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
  p { margin: 0; padding: calc(10 * var(--s)) 0; display: flex; gap: calc(24 * var(--s)); }
  .k { opacity: .5; }
  .v { text-transform: none; letter-spacing: .02em; user-select: text; overflow-wrap: anywhere; }
</style>
