import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const routeDirectory = resolve(
  root,
  '.next/server/app/api/opportunities/[id]/pdf-ingestions/[ingestionId]/verify',
);
const manifestPath = join(routeDirectory, 'route.js.nft.json');

if (!existsSync(manifestPath)) {
  throw new Error('PDF verification route trace was not emitted.');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const files = Array.isArray(manifest.files)
  ? manifest.files.map(file => file.replaceAll('\\', '/'))
  : [];

const required = [
  ['PDF.js main module', /node_modules\/pdfjs-dist\/legacy\/build\/pdf\.mjs$/],
  ['PDF.js worker module', /node_modules\/pdfjs-dist\/legacy\/build\/pdf\.worker\.mjs$/],
  ['canvas package', /node_modules\/@napi-rs\/canvas\//],
  ['platform-native canvas binary', /node_modules\/@napi-rs\/canvas-[^/]+\/[^/]+\.node$/],
];

for (const [label, pattern] of required) {
  if (!files.some(file => pattern.test(file))) {
    throw new Error(`${label} is missing from the PDF verification route trace.`);
  }
}

const clientRoot = resolve(root, '.next/static');
const forbiddenClientMarkers = [
  'pdfjs-dist',
  'pdf.worker.mjs',
  '@napi-rs/canvas',
  'PDFDocumentLoadingTask',
];

for (const file of walk(clientRoot)) {
  if (!/\.(?:js|mjs)$/.test(file)) continue;
  const content = readFileSync(file, 'utf8');
  const leaked = forbiddenClientMarkers.find(marker => content.includes(marker));
  if (leaked) {
    throw new Error(
      `Server PDF runtime marker ${JSON.stringify(leaked)} appeared in client output ${relative(root, file)}.`,
    );
  }
}

console.log('PDF verification runtime trace contract passed.');

function* walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}
