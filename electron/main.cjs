const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const { exec } = require('child_process');
const { pathToFileURL } = require('url');

/**
 * Ensures Windows 11 uses the classic reliable Print Dialog instead of the
 * buggy UnifiedPrintDialog which displays "This app doesn't support print preview"
 */
function ensureLegacyPrintDialog() {
  if (process.platform === 'win32') {
    try {
      exec('reg add "HKCU\\Software\\Microsoft\\Print\\UnifiedPrintDialog" /v "PreferLegacyPrintDialog" /t REG_DWORD /d 1 /f', () => {});
    } catch (e) {}
  }
}
ensureLegacyPrintDialog();

const debugLogPath = path.join(os.homedir(), 'smarttech_desktop_debug.log');
function logDebug(msg) {
  const line = `[${new Date().toISOString()}] [PID:${process.pid}] ${msg}\n`;
  try {
    fs.appendFileSync(debugLogPath, line);
  } catch (e) {}
  console.log(msg);
}

logDebug(`Starting process. argv: ${process.argv.join(' ')}`);

process.on('uncaughtException', (err) => {
  logDebug(`[CRASH uncaughtException]: ${err && err.stack ? err.stack : err}`);
});

process.on('unhandledRejection', (reason) => {
  logDebug(`[CRASH unhandledRejection]: ${reason && reason.stack ? reason.stack : reason}`);
});

process.on('exit', (code) => {
  logDebug(`[process exit] code: ${code}`);
});

app.on('will-quit', () => {
  logDebug('[app will-quit] triggered');
});

app.on('quit', (e, code) => {
  logDebug(`[app quit] code: ${code}`);
});

let mainWindow = null;
const BACKEND_PORT = 5000;
const DEV_PORT = 3000;

function getServerPath() {
  const candidates = [
    path.join(process.resourcesPath, 'app/server/server.js'),
    path.join(process.resourcesPath, 'app.asar.unpacked/server/server.js'),
    path.join(__dirname, '../server/server.js')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, '../server/server.js');
}

function getDistPath() {
  const candidates = [
    path.join(process.resourcesPath, 'app/dist'),
    path.join(process.resourcesPath, 'app.asar.unpacked/dist'),
    path.join(__dirname, '../dist')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, '../dist');
}

/**
 * Resolves persistent SQLite database path
 */
function resolveDatabasePath() {
  if (app.isPackaged) {
    const userDataDir = app.getPath('userData');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    const targetDbPath = path.join(userDataDir, 'smarttech_database.sqlite');
    
    // If target database doesn't exist yet, try to copy initial seed database
    if (!fs.existsSync(targetDbPath)) {
      const seedDbCandidates = [
        path.join(process.resourcesPath, 'app/server/smarttech_database.sqlite'),
        path.join(process.resourcesPath, 'app.asar.unpacked/server/smarttech_database.sqlite'),
        path.join(__dirname, '../server/smarttech_database.sqlite')
      ];
      for (const seedDbPath of seedDbCandidates) {
        if (fs.existsSync(seedDbPath)) {
          try {
            fs.copyFileSync(seedDbPath, targetDbPath);
            logDebug(`[Electron] Initialized user database from seed: ${seedDbPath}`);
            break;
          } catch (err) {
            logDebug(`[Electron] Could not copy seed DB: ${err.message}`);
          }
        }
      }
    }
    return targetDbPath;
  }
  return path.join(__dirname, '../server/smarttech_database.sqlite');
}

/**
 * Checks if a local HTTP port is responding
 */
function checkPortResponding(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/auth/members`, { timeout: 600 }, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Starts Express backend directly in the Electron process if not already running
 */
async function ensureBackendServer() {
  logDebug(`ensureBackendServer() called. Checking port ${BACKEND_PORT}...`);
  const isRunning = await checkPortResponding(BACKEND_PORT);
  if (isRunning) {
    logDebug(`[Electron] Backend server already running on port ${BACKEND_PORT}`);
    return;
  }

  const dbPath = resolveDatabasePath();
  const serverPath = getServerPath();
  const distPath = getDistPath();

  process.env.SMARTTECH_DB_PATH = dbPath;
  process.env.CLIENT_DIST_PATH = distPath;
  process.env.PORT = String(BACKEND_PORT);
  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';

  logDebug('[Electron] Initializing backend server in main process...');
  logDebug(`[Electron] Server path: ${serverPath}`);
  logDebug(`[Electron] Database location: ${dbPath}`);

  try {
    await import(pathToFileURL(serverPath).href);
    logDebug(`[Electron] Backend server imported, listening on port ${BACKEND_PORT}`);
  } catch (err) {
    logDebug(`[Electron] Failed to start backend server: ${err && err.stack ? err.stack : err}`);
  }

  // Poll until route responds
  let retries = 0;
  while (retries < 40) {
    const ready = await checkPortResponding(BACKEND_PORT);
    if (ready) {
      logDebug(`[Electron] Backend server confirmed ready on port ${BACKEND_PORT}`);
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
    retries++;
  }
}

/**
 * Creates Main Desktop Window
 */
async function createWindow() {
  logDebug('createWindow() invoked');
  const iconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'SMART TECH - Billing & Quotation',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    backgroundColor: '#020617',
    show: true, // Show immediately
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  logDebug(`BrowserWindow created. Window ID: ${mainWindow.id}`);

  mainWindow.once('ready-to-show', () => {
    logDebug('mainWindow ready-to-show fired. Focusing window in foreground.');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false);
        }
      }, 300);
    }
  });

  let targetUrl = `http://127.0.0.1:${BACKEND_PORT}`;
  if (!app.isPackaged) {
    const isViteUp = await checkPortResponding(DEV_PORT);
    if (isViteUp) {
      targetUrl = `http://localhost:${DEV_PORT}`;
    }
  }

  logDebug(`Loading initial URL: ${targetUrl}`);
  mainWindow.loadURL(targetUrl).catch((err) => {
    logDebug(`Initial loadURL error: ${err.message}`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    logDebug(`mainWindow render-process-gone: ${JSON.stringify(details)}`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logDebug(`mainWindow did-fail-load: code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
    // Ignore ERR_ABORTED (-3) as it is benign
    if (errorCode === -3) return;

    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        logDebug('Retrying loadURL after failure...');
        mainWindow.loadURL(`http://127.0.0.1:${BACKEND_PORT}`).catch((e) => {
          logDebug(`Retry loadURL failed: ${e.message}`);
        });
      }
    }, 1000);
  });

  // Handle external links in native web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('close', () => {
    logDebug('mainWindow "close" event fired');
  });

  mainWindow.on('closed', () => {
    logDebug('mainWindow "closed" event fired');
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('print-document', (event) => {
  ensureLegacyPrintDialog();
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.webContents.print({ 
      silent: false, 
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'none' }
    });
  }
});

ipcMain.handle('print-to-pdf', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    try {
      const data = await win.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { marginType: 'none' }
      });
      return data;
    } catch (e) {
      logDebug(`[printToPDF error]: ${e.message}`);
      return null;
    }
  }
  return null;
});

ipcMain.on('open-external', (_, url) => {
  if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
    shell.openExternal(url);
  }
});

app.whenReady().then(async () => {
  logDebug('app.whenReady() resolved');
  
  // 1. Initialize embedded backend server first (takes < 300ms)
  await ensureBackendServer();

  // 2. Open desktop window and load application directly
  createWindow();

  app.on('activate', () => {
    logDebug('app "activate" event fired');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logDebug('app "window-all-closed" event fired');
  if (process.platform !== 'darwin') {
    logDebug('Calling app.quit() from window-all-closed');
    app.quit();
  }
});
