import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const KiB = 1024;
const MiB = KiB * KiB;

const distDir = path.resolve(process.argv[2] || 'dist');
const indexPath = path.join(distDir, 'index.html');

const limits = {
    totalDistRaw: 10 * MiB,
    initialRaw: 2.25 * MiB,
    initialGzip: 650 * KiB,
    largestAssetRaw: 600 * KiB
};

function formatBytes(bytes) {
    if (bytes >= MiB) return `${(bytes / MiB).toFixed(2)} MiB`;
    return `${(bytes / KiB).toFixed(1)} KiB`;
}

function walkFiles(dir) {
    const files = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkFiles(fullPath));
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }

    return files;
}

function fileSize(file) {
    return fs.statSync(file).size;
}

function gzipSize(file) {
    return zlib.gzipSync(fs.readFileSync(file)).length;
}

function getInitialAssetPaths() {
    const html = fs.readFileSync(indexPath, 'utf8');
    const refs = new Set(['index.html']);
    const attrRegex = /\b(?:href|src)=["']([^"']+)["']/g;
    let match;

    while ((match = attrRegex.exec(html))) {
        const ref = match[1].split(/[?#]/)[0];
        if (!ref || /^(?:https?:|data:|blob:)/.test(ref)) continue;
        if (!/\.(?:css|html|js)$/.test(ref)) continue;

        refs.add(ref.replace(/^\/+/, ''));
    }

    return [...refs]
        .map(ref => path.join(distDir, decodeURIComponent(ref)))
        .filter(file => fs.existsSync(file));
}

function checkBudget(name, actual, limit, detail = '') {
    const ok = actual <= limit;
    const suffix = detail ? ` (${detail})` : '';
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${formatBytes(actual)} / ${formatBytes(limit)}${suffix}`);
    return ok;
}

if (!fs.existsSync(distDir) || !fs.existsSync(indexPath)) {
    console.error(`Bundle budget check failed: missing ${path.relative(process.cwd(), indexPath)}`);
    process.exit(1);
}

const allFiles = walkFiles(distDir);
const totalDistRaw = allFiles.reduce((sum, file) => sum + fileSize(file), 0);
const initialAssets = getInitialAssetPaths();
const initialRaw = initialAssets.reduce((sum, file) => sum + fileSize(file), 0);
const initialGzip = initialAssets.reduce((sum, file) => sum + gzipSize(file), 0);
const largestAsset = allFiles.reduce((largest, file) => {
    const size = fileSize(file);
    return size > largest.size ? { file, size } : largest;
}, { file: '', size: 0 });

console.log('Bundle budget check');

const results = [
    checkBudget('dist total raw', totalDistRaw, limits.totalDistRaw),
    checkBudget('initial page raw', initialRaw, limits.initialRaw),
    checkBudget('initial page gzip', initialGzip, limits.initialGzip),
    checkBudget(
        'largest asset raw',
        largestAsset.size,
        limits.largestAssetRaw,
        path.relative(distDir, largestAsset.file)
    )
];

if (results.includes(false)) {
    console.error('Bundle budget exceeded. Trim the bundle or deliberately raise the budget in scripts/check-bundle-budget.mjs.');
    process.exit(1);
}
