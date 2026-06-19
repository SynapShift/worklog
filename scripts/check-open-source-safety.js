const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();

const blockedPaths = [
  'wrangler.toml',
  '.wrangler',
  '.env',
  '.env.local',
  '.env.production',
  '.dev.vars',
  'dist',
  'node_modules',
  'android',
  'ios',
];

const allowedExampleFiles = new Set([
  '.env.example',
  'wrangler.example.toml',
]);

const contentChecks = [
  {
    name: 'non-example wrangler database id',
    pattern: /database_id\s*=\s*"(?!YOUR_D1_DATABASE_ID")[^"]+"/i,
    ignore: (file) => file === 'wrangler.example.toml',
  },
  {
    name: 'OpenAI-like API key',
    pattern: /sk-[A-Za-z0-9_-]{20,}/,
  },
  {
    name: 'private key block',
    pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/,
  },
  {
    name: 'Cloudflare API token assignment',
    pattern: /CLOUDFLARE(?:_API)?_TOKEN\s*=\s*["']?[^"'\s]+/i,
  },
  {
    name: 'generic secret assignment',
    pattern: /(?:SECRET|PRIVATE_TOKEN|ACCESS_TOKEN)\s*=\s*["']?[^"'\s]+/i,
  },
];

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function isIgnored(relPath) {
  try {
    execFileSync('git', ['check-ignore', '-q', relPath], { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function gitCandidateFiles() {
  try {
    const output = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z', '--', '.'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return output.split('\0').filter(Boolean).map((file) => file.replace(/^\.\//, ''));
  } catch {
    return walk(root)
      .map(relative)
      .filter((file) => !isBlockedByKnownDir(file));
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    const relPath = relative(fullPath);

    if (isBlockedByKnownDir(relPath)) return [];
    if (entry.isDirectory()) return walk(fullPath);
    if (!entry.isFile()) return [];
    return [fullPath];
  });
}

function isBlockedByKnownDir(relPath) {
  return blockedPaths.some((blocked) => relPath === blocked || relPath.startsWith(`${blocked}/`));
}

function readTextFile(relPath) {
  const fullPath = path.join(root, relPath);
  const stat = fs.statSync(fullPath);
  if (stat.size > 1024 * 1024) return '';
  const buffer = fs.readFileSync(fullPath);
  if (buffer.includes(0)) return '';
  return buffer.toString('utf8');
}

const failures = [];

for (const blocked of blockedPaths) {
  if (exists(blocked) && !isIgnored(blocked)) {
    failures.push(`${blocked} exists but is not ignored by git`);
  }
}

const candidates = gitCandidateFiles();

for (const file of candidates) {
  if (allowedExampleFiles.has(file)) continue;

  if (isBlockedByKnownDir(file) || /\.(apk|aab|ipa|keystore)$/i.test(file)) {
    failures.push(`${file} would be included but should stay private/generated`);
  }
}

for (const file of candidates) {
  if (isBlockedByKnownDir(file)) continue;

  const text = readTextFile(file);
  if (!text) continue;

  for (const check of contentChecks) {
    if (check.ignore?.(file)) continue;
    if (check.pattern.test(text)) {
      failures.push(`${file} appears to contain ${check.name}`);
    }
  }
}

if (failures.length) {
  console.error('Open-source safety check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Open-source safety check passed. Checked ${candidates.length} publishable files.`);
