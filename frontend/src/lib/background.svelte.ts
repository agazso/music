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
export async function importBackground(src: File | string): Promise<boolean> {
  const b = typeof src === 'string' ? await blobFromText(src) : src;
  if (!b || !IMAGE.test(b.type)) return false;
  await saveCustom(b); show(b); bg.material = 'custom';
  return true;
}
export async function clearBackground() {
  await deleteCustom();
  if (bg.custom) URL.revokeObjectURL(bg.custom);
  bg.custom = '';
  if (bg.material === 'custom') bg.material = 'vinyl';
}
