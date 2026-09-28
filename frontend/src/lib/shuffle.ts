// a shuffled play order as an index: position -> song number 0..n-1. Walking it one step at a time never repeats a
// song within a cycle, and going back and forth is just moving the cursor. A plain Fisher-Yates over a typed array
// takes ~3 ms for 300k songs, so it is rebuilt whole rather than kept up to date incrementally like VLC's randomizer

// `first` (a song number, or -1) is put at position 0: the song playing when the order is (re)built
export function shuffle(n: number, first = -1, rnd = Math.random): Uint32Array {
  const p = new Uint32Array(n);
  for (let i = 0; i < n; i++) p[i] = i;
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  if (first >= 0 && first < n) moveTo(p, first, 0);
  return p;
}

// a song picked by hand plays next without breaking the permutation: it swaps places with the one at `at`
export function moveTo(p: Uint32Array, song: number, at: number) {
  const i = p.indexOf(song);
  if (i < 0 || at >= p.length) return;
  p[i] = p[at]; p[at] = song;
}

// self-check: node --experimental-strip-types -e "import('./src/lib/shuffle.ts').then(m => m.check())"
export function check() {
  const isPerm = (p: Uint32Array) => new Set(p).size === p.length && p.every((v) => v < p.length);
  for (let k = 0; k < 2000; k++) {
    const n = 1 + (k % 30), first = k % (n + 1) - 1, p = shuffle(n, first);
    console.assert(isPerm(p), 'a permutation');
    if (first >= 0) console.assert(p[0] === first, 'the playing song opens the order');
    // a new cycle rebuilt around the last song of the previous one: position 0 is that song, so the next one differs
    const q = shuffle(n, p[n - 1]);
    console.assert(q[0] === p[n - 1] && (n === 1 || q[1] !== p[n - 1]), 'no back-to-back repeat across cycles');
    const r = p.slice(), song = k % n, at = Math.min(n - 1, k % 7);
    moveTo(r, song, at);
    console.assert(isPerm(r) && r[at] === song, 'a hand pick keeps the permutation');
  }
  const big = shuffle(300000);
  console.assert(isPerm(big), 'large permutation');
  console.log('ok');
}
