import { blobFromText, deleteCustom, loadCustom, saveCustom } from './background';

export const MATERIALS = { vinyl: 'Vinyl', grille: 'Grille', fabric: 'Fabric', custom: 'Custom' } as const;
export type Material = keyof typeof MATERIALS;

// how the grid's background looks; every option is saved as it changes (device only, like the other settings)
const saved = JSON.parse(localStorage.getItem('bg') ?? '{}');
export const bg = $state({
  material: (saved.material in MATERIALS ? saved.material : localStorage.getItem('material') ?? 'vinyl') as Material,
  scroll: saved.scroll ?? true, // the background moves with the cards, or stays put behind them
  tile: saved.tile ?? true, // custom image repeats at its own size, or is stretched to fill the screen
  custom: '', // object URL of the imported image, '' when there is none
});
$effect.root(() => { $effect(() => { localStorage.setItem('bg', JSON.stringify({ material: bg.material, scroll: bg.scroll, tile: bg.tile })); }); });

const IMAGE = /^image\/(svg\+xml|png|jpeg|webp|gif|avif)$/;
function show(b: Blob) { if (bg.custom) URL.revokeObjectURL(bg.custom); bg.custom = URL.createObjectURL(b); }
loadCustom().then((b) => { if (b) show(b); }).catch(() => {});

// a picked or dropped file, or pasted SVG / CSS from a generator; false when it is not an image
export async function importBackground(src: Blob | string): Promise<boolean> {
  const b = typeof src === 'string' ? await blobFromText(src) : src;
  if (!b || !IMAGE.test(b.type)) return false;
  await saveCustom(b); show(b); bg.material = 'custom';
  return true;
}
// 20 sample backgrounds from fffuel.co's generators (free for any use, no attribution needed), bundled in
// public/backgrounds. A random pick never repeats the previous one, across restarts too
const SAMPLES = ['bbblurry', 'ccchaos', 'cccoil', 'ffflurry', 'ffflux', 'gggyrate', 'hhhorizon', 'llleaves', 'nnnoise', 'ooorganize',
  'oooscillate', 'rrrepeat', 'rrreplicate', 'ssspiral', 'sssquiggly', 'ttten', 'tttwinkle', 'uuundulate', 'vvvortex', 'wwwhirl'];
export function nextSample(last: number, n = SAMPLES.length, rnd = Math.random) {
  let i = Math.floor(rnd() * (last < 0 ? n : n - 1));
  if (last >= 0 && i >= last) i++;
  return i;
}
export async function randomBackground() {
  const i = nextSample(Number(localStorage.getItem('bg.sample') ?? -1));
  localStorage.setItem('bg.sample', String(i));
  return importBackground(await (await fetch(`${import.meta.env.BASE_URL}backgrounds/${SAMPLES[i]}.svg`)).blob());
}
export async function clearBackground() {
  await deleteCustom();
  if (bg.custom) URL.revokeObjectURL(bg.custom);
  bg.custom = '';
  if (bg.material === 'custom') bg.material = 'vinyl';
}
