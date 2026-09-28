// turns what a background generator hands out (fffuel & co.) into the image bytes: raw SVG markup, a CSS snippet
// with a data URL in it (`background-image: url("data:image/svg+xml,...")`), or a bare data URL.
// null means the text is none of those
export async function blobFromText(text: string): Promise<Blob | null> {
  const t = text.trim();
  const data = t.match(/data:image\/[^"')\s]+/);
  if (data) return (await fetch(data[0])).blob();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)?<svg[\s>]/.test(t)) return new Blob([t], { type: 'image/svg+xml' });
  return null;
}

// a one-slot store for the background bytes; IndexedDB keeps the file as is, no base64 bloat or localStorage cap
// ponytail: single fixed key; give it names when there is a list of backgrounds to pick from
const KEY = 'background';
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('musicapp', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const s = (await db()).transaction('kv', mode).objectStore('kv');
  return new Promise((resolve, reject) => { const r = op(s); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
export const loadCustom = () => tx('readonly', (s) => s.get(KEY) as IDBRequest<Blob | undefined>);
export const saveCustom = (b: Blob) => tx('readwrite', (s) => s.put(b, KEY));
export const deleteCustom = () => tx('readwrite', (s) => s.delete(KEY));

// self-check: node --experimental-strip-types -e "import('./src/lib/background.ts').then(m => m.check())"
export async function check() {
  const svg = await blobFromText('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
  console.assert(svg?.type === 'image/svg+xml' && svg.size > 0, 'svg markup');
  const xml = await blobFromText('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>');
  console.assert(xml?.type === 'image/svg+xml', 'svg with xml prolog');
  const css = await blobFromText("body { background-image: url('data:image/svg+xml;base64,PHN2Zy8+'); }");
  console.assert(css?.type === 'image/svg+xml' && (await css.text()) === '<svg/>', 'css snippet with data url');
  const png = await blobFromText('data:image/png;base64,iVBORw0KGgo=');
  console.assert(png?.type === 'image/png' && png.size === 8, 'bare data url');
  console.assert((await blobFromText('hello')) === null, 'plain text rejected');
  console.log('ok');
}
