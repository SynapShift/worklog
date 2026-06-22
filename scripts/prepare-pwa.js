const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#111827"/>
  <path fill="#fff" d="M118 152h54l37 183 43-132h38l43 132 37-183h54L366 372h-58l-37-116-37 116h-58L118 152Z"/>
  <path fill="#cbd5e1" d="M142 112h228v24H142z"/>
</svg>`;

function makeCrcTable() {
  const table = [];
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function inRoundedRect(x, y, size, radius) {
  const max = size - 1;
  const cx = x < radius ? radius : x > max - radius ? max - radius : x;
  const cy = y < radius ? radius : y > max - radius ? max - radius : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function createIconPng(size) {
  const zlib = require('zlib');
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const radius = size * 0.22;
  const wPoints = [
    [size * 0.23, size * 0.32],
    [size * 0.34, size * 0.32],
    [size * 0.41, size * 0.66],
    [size * 0.49, size * 0.41],
    [size * 0.56, size * 0.41],
    [size * 0.64, size * 0.66],
    [size * 0.71, size * 0.32],
    [size * 0.82, size * 0.32],
    [size * 0.7, size * 0.74],
    [size * 0.59, size * 0.74],
    [size * 0.525, size * 0.51],
    [size * 0.45, size * 0.74],
    [size * 0.34, size * 0.74],
  ];
  const bar = {
    left: size * 0.28,
    right: size * 0.72,
    top: size * 0.22,
    bottom: size * 0.265,
  };

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = row + 1 + x * 4;
      const visible = inRoundedRect(x, y, size, radius);
      const inBar = visible && x >= bar.left && x <= bar.right && y >= bar.top && y <= bar.bottom;
      const inW = visible && pointInPolygon(x, y, wPoints);
      const color = inW ? [255, 255, 255, 255] : inBar ? [203, 213, 225, 255] : visible ? [17, 24, 39, 255] : [0, 0, 0, 0];
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
      raw[offset + 3] = color[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const manifest = {
  name: 'WorkLog',
  short_name: 'WorkLog',
  description: 'A personal worklog, calendar, goals and weekly report assistant.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#f5f6f8',
  theme_color: '#111827',
  icons: [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
  ],
};

const buildId = Date.now().toString(36);

const serviceWorker = `const CACHE_NAME = 'worklog-pwa-${buildId}';
const ASSETS = ['/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
  );
});`;

const headers = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/robots.txt
  Content-Type: text/plain
  Cache-Control: no-cache

/sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Content-Type: application/manifest+json

/icon-192.png
  Content-Type: image/png

/icon-512.png
  Content-Type: image/png
`;

function injectHead(html) {
  const cleaned = html
    .replace(/\s*<meta name="theme-color" content="[^"]*" \/?>/g, '')
    .replace(/\s*<meta name="mobile-web-app-capable" content="[^"]*" \/?>/g, '')
    .replace(/\s*<meta name="apple-mobile-web-app-capable" content="[^"]*" \/?>/g, '')
    .replace(/\s*<meta name="apple-mobile-web-app-title" content="[^"]*" \/?>/g, '')
    .replace(/\s*<meta name="apple-mobile-web-app-status-bar-style" content="[^"]*" \/?>/g, '')
    .replace(/\s*<link rel="manifest" href="[^"]*" \/?>/g, '')
    .replace(/\s*<link rel="icon" href="[^"]*"[^>]*>/g, '')
    .replace(/\s*<link rel="apple-touch-icon" href="[^"]*" \/?>/g, '');
  const tags = [
    '<meta name="theme-color" content="#111827" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-title" content="WorkLog" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    '<link rel="manifest" href="/manifest.webmanifest" />',
    '<link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />',
    '<link rel="icon" href="/icon.svg" type="image/svg+xml" />',
    '<link rel="apple-touch-icon" href="/icon-192.png" />',
  ].join('\n    ');

  return cleaned.replace('</head>', `    ${tags}\n  </head>`);
}

function injectServiceWorker(html) {
  const snippet = `<script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
    }
  </script>`;

  if (html.includes("serviceWorker.register('/sw.js')")) return html;
  return html.replace('</body>', `  ${snippet}\n</body>`);
}

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'icon.svg'), iconSvg);
fs.writeFileSync(path.join(distDir, 'icon-192.png'), createIconPng(192));
fs.writeFileSync(path.join(distDir, 'icon-512.png'), createIconPng(512));
fs.writeFileSync(path.join(distDir, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(distDir, 'sw.js'), serviceWorker);
fs.writeFileSync(path.join(distDir, 'robots.txt'), 'User-agent: *\nDisallow: /api/\n');
fs.writeFileSync(path.join(distDir, '_headers'), headers);

if (fs.existsSync(indexPath)) {
  const current = fs.readFileSync(indexPath, 'utf8');
  fs.writeFileSync(indexPath, injectServiceWorker(injectHead(current)));
}
