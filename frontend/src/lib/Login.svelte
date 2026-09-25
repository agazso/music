<script lang="ts">
  import { login } from './api.svelte';
  let url = $state('http://localhost:4533'), username = $state(''), password = $state(''), error = $state('');
  async function submit(e: SubmitEvent) {
    e.preventDefault(); error = '';
    try { await login({ url, username, password }); } catch (err) { error = (err as Error).message || 'Login failed'; }
  }
</script>

<form onsubmit={submit}>
  <input bind:value={url} placeholder="Navidrome URL" />
  <input bind:value={username} placeholder="Username" autocomplete="username" />
  <input bind:value={password} type="password" placeholder="Password" autocomplete="current-password" />
  {#if error}<p>{error}</p>{/if}
  <button>Enter</button>
</form>

<style>
  form { position: fixed; inset: 0; display: grid; place-content: center; gap: 10px; width: 280px; margin: auto; }
  input, button { all: unset; box-sizing: border-box; width: 100%; padding: 10px 12px; border: 1px solid #333; color: #eee; font-size: 14px; }
  input:focus { border-color: #888; }
  button { text-align: center; cursor: pointer; border-color: #666; margin-top: 8px; }
  p { color: #e66; font-size: 13px; margin: 0; }
</style>
