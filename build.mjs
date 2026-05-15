// TrailKit build script
//
// Reads source modules under src/, bundles src/trailkit/app.js into a single
// IIFE with esbuild, then inlines the bundle and the CSS into src/index.html
// and writes the result to dist/TrailKit.html.
//
// Output is a single self-contained HTML file with no external dependencies —
// the same shape as the hand-authored TrailKit-1.0.html at the repo root, but
// produced from real modular source.
//
// Usage:
//   node build.mjs           // one-shot build
//   node build.mjs --watch   // rebuild on file changes

import { build, context } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT      = __dirname;
const SRC       = resolve(ROOT, 'src');
const DIST      = resolve(ROOT, 'dist');
const ENTRY     = resolve(SRC, 'trailkit/app.js');
const SHELL     = resolve(SRC, 'index.html');
const STYLES    = resolve(SRC, 'styles/app.css');
const OUT_FILE  = resolve(DIST, 'TrailKit.html');

const watchMode = process.argv.includes('--watch');

// ── Bundle the TrailKit app ──────────────────────────────────────
// We bundle into a single IIFE so the result is a valid <script> body.
// No minification — we want the inlined source to remain readable so
// browser devtools and "view source" stay useful.
const esbuildOpts = {
  entryPoints: [ENTRY],
  bundle:      true,
  format:      'iife',
  target:      'es2020',
  write:       false,
  logLevel:    'info',
  legalComments: 'inline',
};

async function inlineBundle() {
  const [result, shell, css] = await Promise.all([
    build(esbuildOpts),
    readFile(SHELL, 'utf8'),
    readFile(STYLES, 'utf8'),
  ]);

  const bundleJs = result.outputFiles[0].text;

  // Replace placeholders. Use a function replacer so $-signs in the
  // bundled JS don't get interpreted as regex back-references.
  const html = shell
    .replace('<!-- {{STYLES}} -->', () => `<style>\n${css}\n</style>`)
    .replace('<!-- {{SCRIPT}} -->', () => `<script>\n${bundleJs}\n</script>`);

  await mkdir(DIST, { recursive: true });
  await writeFile(OUT_FILE, html, 'utf8');

  const kb = (html.length / 1024).toFixed(1);
  console.log(`✓ wrote ${OUT_FILE} (${kb} KB)`);
}

if (watchMode) {
  const ctx = await context({
    ...esbuildOpts,
    plugins: [{
      name: 'inline-and-write',
      setup(b) {
        b.onEnd(async (result) => {
          if (result.errors.length) return;
          try { await inlineBundle(); }
          catch (err) { console.error('Inline step failed:', err); }
        });
      },
    }],
  });
  await ctx.watch();
  console.log('Watching src/ for changes…');
} else {
  await inlineBundle();
}
