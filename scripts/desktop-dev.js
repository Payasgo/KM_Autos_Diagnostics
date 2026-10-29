import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const electronBin = path.join(root, 'node_modules', 'electron', 'cli.js');
const url = 'http://127.0.0.1:3000';
const children = new Set();
let stopping = false;

function launch(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options });
  children.add(child);
  child.once('exit', (code) => {
    children.delete(child);
    if (!stopping) shutdown(code ?? 1);
  });
  child.once('error', (error) => {
    console.error(error);
    if (!stopping) shutdown(1);
  });
  return child;
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
  process.exitCode = code;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const vite = launch(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '3000', '--strictPort']);
let ready = false;
for (let attempt = 0; attempt < 120 && !stopping; attempt += 1) {
  try {
    const response = await fetch(url);
    if (response.ok) { ready = true; break; }
  } catch { /* Vite is still starting. */ }
  if (vite.exitCode !== null) break;
  await delay(250);
}

if (!ready) {
  console.error(`Vite did not become ready at ${url}. Make sure port 3000 is available.`);
  shutdown(1);
} else if (!stopping) {
  console.log(`KM Autos Diagnostics desktop development server: ${url}`);
  launch(process.execPath, [electronBin, '.'], {
    env: { ...process.env, KM_AUTOS_DEV_SERVER_URL: url },
  });
}
