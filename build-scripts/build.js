import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const build = async () => {
  // IIFE build for <script> tag usage (global `VietQR`), also used by demo/.
  await esbuild.build({
    entryPoints: ['src/index.js'],
    bundle: true,
    outfile: 'dist/vietqr.umd.js',
    format: 'iife',
    globalName: 'VietQR',
  });

  await esbuild.build({
    entryPoints: ['src/index.js'],
    bundle: true,
    outfile: 'dist/vietqr-core.min.js',
    format: 'iife',
    globalName: 'VietQR',
    minify: true,
  });

  await esbuild.build({
    entryPoints: ['src/card.js'],
    bundle: true,
    outfile: 'dist/vietqr-card.min.js',
    format: 'iife',
    globalName: 'VietQRCard',
    minify: true,
  });

  // CJS build for Node `require('vietqr-core')`. Must be a real CJS module
  // (not IIFE) so module.exports is populated; `.cjs` extension keeps it
  // CommonJS regardless of the package's "type": "module".
  await esbuild.build({
    entryPoints: ['src/index.js'],
    bundle: true,
    outfile: 'dist/vietqr.cjs',
    format: 'cjs',
    platform: 'node',
  });

  await esbuild.build({
    entryPoints: ['src/card.js'],
    bundle: true,
    outfile: 'dist/vietqr-card.cjs',
    format: 'cjs',
    platform: 'node',
  });

  // Inline the minified bundle into docs/index.html so the demo file keeps
  // working when saved/moved standalone (its relative `../dist/...` src
  // breaks the moment it's no longer sitting next to dist/).
  const bundleCore = readFileSync('dist/vietqr-core.min.js', 'utf8').trim();
  const bundleCard = readFileSync('dist/vietqr-card.min.js', 'utf8').trim();
  const demoPath = 'docs/index.html';
  const demoHtml = readFileSync(demoPath, 'utf8');
  const updatedDemoHtml = demoHtml.replace(
    /<script id="vietqr-bundle">[\s\S]*?<\/script>/,
    () => `<script id="vietqr-bundle">\n${bundleCore}\n\n${bundleCard}\n  </script>`
  );
  writeFileSync(demoPath, updatedDemoHtml);

  console.log('Build complete');
};

build().catch(() => process.exit(1));
