/**
 * Electron shell for ECU Lab.
 *
 * The app is a static Vite build and stays one. This file only hosts `dist/` in a
 * window; it does not touch the simulation, the UI or the build, so the website and
 * the desktop app are the same code and cannot drift apart.
 *
 * `dist/` is served from a custom `app://ecu-lab/` origin rather than `file://`. A
 * real, secure origin gives module scripts, `fetch`, `localStorage` and Web Audio the
 * same behaviour they have on the hosted site, and keeps the saved career stable
 * wherever the app is installed.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, protocol, session, shell } from 'electron';

const SCHEME = 'app';
const HOST = 'ecu-lab';
const ENTRY = `${SCHEME}://${HOST}/index.html`;
const DEV_SERVER_URL = process.env.KM_AUTOS_DEV_SERVER_URL?.replace(/\/$/, '');

/** The Vite build. Inside a packaged app this resolves into `app.asar`. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', 'dist');

/**
 * Window and taskbar icon for Windows and Linux (macOS takes it from the app bundle).
 * The installers' own icons are built from build/icon.png by electron-builder; this
 * copy is what the running window shows, and what replaces the Electron logo in dev.
 * It is a 512px export of build/icon.png: re-export both whenever the icon changes.
 */
const ICON = path.join(HERE, 'icon.png');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

// Must run before the app is ready.
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportsFetchAPI: true } },
]);

function registerAppProtocol() {
  const respond = (body, init) => new globalThis.Response(body, init);

  protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url);
    if (url.host !== HOST) return respond('Not found', { status: 404 });

    try {
      // Inside the try: a malformed escape such as %E0%A4%A throws here, and should be
      // an ordinary 404 rather than an unhandled error.
      const requested = decodeURIComponent(url.pathname);
      const file = path.normalize(path.join(ROOT, requested === '/' ? 'index.html' : requested));

      // Nothing outside dist/ is ever served, whatever the URL says.
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
        return respond('Forbidden', { status: 403 });
      }

      const body = await readFile(file);
      const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
      const headers = { 'content-type': type };
      // Apply a restrictive policy to the document that boots the app. Bundled scripts
      // and assets are same-origin; inline styles are retained for the small critical
      // style block in index.html. No remote scripts, objects, frames, or form targets.
      if (path.extname(file).toLowerCase() === '.html') {
        headers['content-security-policy'] = [
          "default-src 'none'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "media-src 'self' data: blob:",
          "connect-src 'self'",
          "worker-src 'self' blob:",
          "base-uri 'none'",
          "form-action 'none'",
          "frame-ancestors 'none'",
          "object-src 'none'",
        ].join('; ');
      }
      return respond(body, { headers });
    } catch {
      return respond('Not found', { status: 404 });
    }
  });
}

const isWeb = (url) => /^https?:\/\//i.test(url);

/** True for any address on the app's own origin, not just the entry page. */
const isApp = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === `${SCHEME}:` && parsed.host === HOST) return true;
    // During desktop development, Vite serves the same UI on port 3000.
    // Only the exact configured origin is allowed inside the Electron window.
    return Boolean(DEV_SERVER_URL && parsed.origin === new URL(DEV_SERVER_URL).origin);
  } catch {
    return false;
  }
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'ECU Lab',
    // Matches the page background in index.html, so there is no white flash on launch.
    backgroundColor: '#070506',
    icon: ICON,
    // Windows and Linux: hide the menu bar until Alt is pressed.
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Links that would open a new window go to the system browser instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isWeb(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // The window only ever shows the app. Anything on the app's own origin may load (the
  // protocol handler answers 404 for what does not exist, and maps `/` to index.html);
  // everything else is sent to the browser instead. Hash changes, the app's routing,
  // are in-page and never reach this handler.
  win.webContents.on('will-navigate', (event, url) => {
    if (isApp(url)) return;
    event.preventDefault();
    if (isWeb(url)) shell.openExternal(url);
  });

  // Desktop development uses Vite on port 3000; packaged builds use app:// and dist/.
  win.loadURL(DEV_SERVER_URL || ENTRY);
}

// A second copy would share the same profile and fight over its storage, so a second
// launch focuses the window that is already open.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Nothing to show before the app is ready; the first launch is still starting up.
    if (!app.isReady()) return;
    const [win] = BrowserWindow.getAllWindows();
    if (!win) {
      // macOS keeps the app running after its last window closes.
      createWindow();
      return;
    }
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  // The app needs no camera, microphone, notifications or similar access, and never
  // embeds webviews. Refuse both rather than rely on the defaults.
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    registerAppProtocol();
    // A packaged macOS app gets its Dock icon from the bundle. Only a dev run needs it.
    if (!app.isPackaged) app.dock?.setIcon(ICON);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}