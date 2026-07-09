import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.argv[2] || 'dist');
const indexPath = path.join(distDir, 'index.html');
const esCheckTarget = 'es2016';

function fail(message) {
    console.error(message);
    process.exit(1);
}

function getInitialScriptPaths(html) {
    const refs = new Set();
    const scriptRegex = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g;
    let match;

    while ((match = scriptRegex.exec(html))) {
        const ref = match[1].split(/[?#]/)[0];
        if (!ref || /^(?:https?:|data:|blob:)/.test(ref)) continue;
        if (!/\.js$/.test(ref)) continue;

        refs.add(ref.replace(/^\/+/, ''));
    }

    return [...refs]
        .map(ref => path.join(distDir, decodeURIComponent(ref)))
        .filter(file => fs.existsSync(file));
}

function getEsCheckBin() {
    const binName = process.platform === 'win32' ? 'es-check.cmd' : 'es-check';
    return path.resolve('node_modules', '.bin', binName);
}

if (!fs.existsSync(indexPath)) {
    fail(`Legacy webOS syntax check failed: missing ${path.relative(process.cwd(), indexPath)}`);
}

const html = fs.readFileSync(indexPath, 'utf8');
const runtimeIndex = html.indexOf('runtime.bundle.js');
const globalThisShimIndex = html.indexOf('typeof globalThis');

if (runtimeIndex !== -1 && (globalThisShimIndex === -1 || globalThisShimIndex > runtimeIndex)) {
    fail('Legacy webOS syntax check failed: globalThis shim must appear before runtime.bundle.js');
}

const scriptPaths = getInitialScriptPaths(html);

if (!scriptPaths.length) {
    fail('Legacy webOS syntax check failed: no startup scripts found in dist/index.html');
}

const esCheckBin = getEsCheckBin();

if (!fs.existsSync(esCheckBin)) {
    fail(`Legacy webOS syntax check failed: missing ${path.relative(process.cwd(), esCheckBin)}`);
}

console.log(`Legacy webOS syntax check: ${scriptPaths.length} startup scripts, ${esCheckTarget}`);

const result = spawnSync(esCheckBin, [esCheckTarget, ...scriptPaths], {
    stdio: 'inherit'
});

if (result.status !== 0) {
    fail('Legacy webOS syntax check failed: startup bundle contains syntax newer than Chrome 53 can safely parse');
}
