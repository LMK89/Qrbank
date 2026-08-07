import * as esbuild from 'esbuild';

const build = async () => {
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

  console.log('Build complete');
};

build().catch(() => process.exit(1));
