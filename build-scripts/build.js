import * as esbuild from 'esbuild';

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
    outfile: 'dist/vietqr.umd.min.js',
    format: 'iife',
    globalName: 'VietQR',
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

  console.log('Build complete');
};

build().catch(() => process.exit(1));
