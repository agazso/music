// downloads the navidrome binary that gets bundled next to the app
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const VERSION = '0.64.2';
const here = path.dirname(new URL(import.meta.url).pathname);
const bin = path.join(here, '..', 'bin');
const out = path.join(bin, 'navidrome');
if (existsSync(out)) { console.log('navidrome already present'); process.exit(0); }
mkdirSync(bin, { recursive: true });
const url = `https://github.com/navidrome/navidrome/releases/download/v${VERSION}/navidrome_${VERSION}_linux_amd64.tar.gz`;
console.log('downloading', url);
execFileSync('curl', ['-sSL', '-o', path.join(bin, 'nd.tgz'), url], { stdio: 'inherit' });
execFileSync('tar', ['-xzf', path.join(bin, 'nd.tgz'), '-C', bin, 'navidrome'], { stdio: 'inherit' });
execFileSync('rm', [path.join(bin, 'nd.tgz')]);
console.log('ok', out);
