#!/usr/bin/env node
/**
 * Pre-compresses the static web build so server.js can serve Brotli / gzip
 * variants without spending CPU on every request.
 *
 * Runs after `expo export --platform web` (see scripts/build-and-verify.sh).
 * For every compressible file under dist/ it writes `<file>.br` and
 * `<file>.gz` next to the original. Variants that do not shrink the file are
 * discarded. Safe to re-run: existing variants are overwritten.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');

// Text-like assets plus raw TrueType/OpenType fonts (which compress ~40-50%).
// Already-compressed formats (woff2, png, jpg, ico) are skipped.
const COMPRESSIBLE = /\.(js|mjs|css|html|json|map|svg|txt|xml|webmanifest|ttf|otf)$/i;
const MIN_BYTES = 1024;

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function writeVariant(file, suffix, buffer, originalSize) {
  const target = `${file}${suffix}`;
  if (buffer.length >= originalSize) {
    if (fs.existsSync(target)) fs.unlinkSync(target);
    return 0;
  }
  fs.writeFileSync(target, buffer);
  return buffer.length;
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`[precompress] dist/ not found at ${DIST_DIR} — run the web export first`);
    process.exit(1);
  }

  const files = walk(DIST_DIR, []).filter((file) => COMPRESSIBLE.test(file));
  let originalTotal = 0;
  let brotliTotal = 0;
  let gzipTotal = 0;
  let count = 0;

  for (const file of files) {
    const source = fs.readFileSync(file);
    if (source.length < MIN_BYTES) continue;

    const brotli = zlib.brotliCompressSync(source, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: source.length,
      },
    });
    const gzip = zlib.gzipSync(source, { level: 9 });

    originalTotal += source.length;
    brotliTotal += writeVariant(file, '.br', brotli, source.length) || source.length;
    gzipTotal += writeVariant(file, '.gz', gzip, source.length) || source.length;
    count += 1;
  }

  const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(2);
  console.log(
    `[precompress] ${count} files: ${mb(originalTotal)} MB raw → ` +
      `${mb(brotliTotal)} MB brotli, ${mb(gzipTotal)} MB gzip`,
  );
}

main();
