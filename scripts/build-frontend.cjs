const path = require('node:path');
const esbuild = require('esbuild');

const options = {
  absWorkingDir: path.resolve(__dirname, '..'),
  entryPoints: { app: 'src/main.jsx', landing: 'src/landing.jsx' },
  outdir: 'assets',
  bundle: true,
  minify: true,
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'eof',
  logLevel: 'info',
};

async function buildFrontend({ watch = false } = {}) {
  if (!watch) return esbuild.build(options);
  const context = await esbuild.context(options);
  // Compile before the PHP server starts accepting requests.
  await context.rebuild();
  await context.watch();
  return context;
}

module.exports = { buildFrontend };
if (require.main === module) {
  buildFrontend({ watch: process.argv.includes('--watch') }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
