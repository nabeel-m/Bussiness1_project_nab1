const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const { exec } = require('child_process');
const { pathToFileURL } = require('url');

// 1. Single Instance Lock — prevents duplicate zombie processes & brings existing window to focus
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  try {
    const debugLog = path.join(os.homedir(), 'smarttech_desktop_debug.log');
    fs.appendFileSync(debugLog, `[${new Date().toISOString()}] [PID:${process.pid}] Duplicate instance launched. Focusing existing window and exiting.\n`);
  } catch (e) {}
  app.quit();
  process.exit(0);
}

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
let backendPort = 5000;
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
 * Checks if a port is currently free/unbound
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port, '127.0.0.1');
  });
}

/**
 * Finds an available port starting from startPort
 */
async function findAvailablePort(startPort) {
  for (let p = startPort; p < startPort + 30; p++) {
    if (await isPortAvailable(p)) return p;
  }
  return startPort;
}

/**
 * Checks if a local HTTP port is responding to our API
 */
function checkPortResponding(port, timeoutMs = 250) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/auth/members`, { timeout: timeoutMs }, (res) => {
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
  logDebug(`ensureBackendServer() called. Checking port ${backendPort}...`);
  const isRunning = await checkPortResponding(backendPort, 200);
  if (isRunning) {
    logDebug(`[Electron] Backend server already running on port ${backendPort}`);
    return;
  }

  // If port 5000 is occupied by a foreign process that is not our API, pick next free port
  const available = await isPortAvailable(backendPort);
  if (!available) {
    const freePort = await findAvailablePort(5001);
    logDebug(`Port ${backendPort} is occupied by another app. Selected free port: ${freePort}`);
    backendPort = freePort;
  }

  const dbPath = resolveDatabasePath();
  const serverPath = getServerPath();
  const distPath = getDistPath();

  process.env.SMARTTECH_DB_PATH = dbPath;
  process.env.CLIENT_DIST_PATH = distPath;
  process.env.PORT = String(backendPort);
  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';

  logDebug('[Electron] Initializing backend server in main process...');
  logDebug(`[Electron] Server path: ${serverPath}`);
  logDebug(`[Electron] Database location: ${dbPath}`);
  logDebug(`[Electron] Bound port: ${backendPort}`);

  try {
    await import(pathToFileURL(serverPath).href);
    logDebug(`[Electron] Backend server imported, listening on port ${backendPort}`);
  } catch (err) {
    logDebug(`[Electron] Failed to start backend server: ${err && err.stack ? err.stack : err}`);
  }

  // Fast polling until route responds (checks every 40ms)
  let retries = 0;
  while (retries < 60) {
    const ready = await checkPortResponding(backendPort, 150);
    if (ready) {
      logDebug(`[Electron] Backend server confirmed ready on port ${backendPort}`);
      break;
    }
    await new Promise((r) => setTimeout(r, 40));
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

  let targetUrl = `http://127.0.0.1:${backendPort}`;
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
        mainWindow.loadURL(`http://127.0.0.1:${backendPort}`).catch((e) => {
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

// -------------------------------------------------------------
// Automatic Weekly Database Backup System (User's Documents folder)
// -------------------------------------------------------------
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

function getBackupDirectory() {
  const docsDir = app.getPath('documents');
  const backupDir = path.join(docsDir, 'SMART TECH Backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const readmePath = path.join(backupDir, 'README_BACKUPS.txt');
  if (!fs.existsSync(readmePath)) {
    const readmeContent = [
      '==============================================================',
      '   SMART TECH Billing & Quotation — Automatic Weekly Backups',
      '==============================================================',
      '',
      'This folder contains automatic weekly backups of your SMART TECH',
      'software database and ledger accounts.',
      '',
      'Files created automatically each week:',
      ' 1. smarttech_backup_YYYY-MM-DD_HH-mm-ss.json',
      '    (Full JSON export — can be viewed in any text editor or restored',
      '     via the "Import Backup" button inside the software)',
      '',
      ' 2. smarttech_database_YYYY-MM-DD_HH-mm-ss.sqlite',
      '    (Complete binary clone of the SQLite database)',
      '',
      'Do not delete this folder. Keep these files safe for data recovery.',
      '=============================================================='
    ].join('\r\n');
    try {
      fs.writeFileSync(readmePath, readmeContent, 'utf8');
    } catch (e) {}
  }
  return backupDir;
}

function getMetadataPath() {
  return path.join(getBackupDirectory(), 'backup_metadata.json');
}

function getBackupMetadata() {
  try {
    const metaPath = getMetadataPath();
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    }
  } catch (e) {}
  return {
    lastBackupTime: 0,
    lastBackupDate: null,
    lastJsonFile: null,
    lastSqliteFile: null,
    folderPath: getBackupDirectory(),
    intervalDays: 7,
    status: 'active'
  };
}

function saveBackupMetadata(meta) {
  try {
    fs.writeFileSync(getMetadataPath(), JSON.stringify(meta, null, 2), 'utf8');
  } catch (e) {
    logDebug(`[AutoBackup] Failed to save metadata: ${e.message}`);
  }
}

function cleanupOldBackups(backupDir, maxToKeep = 12) {
  try {
    const files = fs.readdirSync(backupDir);
    const jsonBackups = files
      .filter(f => f.startsWith('smarttech_backup_') && f.endsWith('.json'))
      .map(f => {
        const fullPath = path.join(backupDir, f);
        return { name: f, fullPath, time: fs.statSync(fullPath).mtimeMs };
      })
      .sort((a, b) => a.time - b.time);

    if (jsonBackups.length > maxToKeep) {
      const toRemove = jsonBackups.slice(0, jsonBackups.length - maxToKeep);
      for (const item of toRemove) {
        try {
          fs.unlinkSync(item.fullPath);
          const baseName = item.name.replace('smarttech_backup_', 'smarttech_database_').replace('.json', '.sqlite');
          const sqlitePath = path.join(backupDir, baseName);
          if (fs.existsSync(sqlitePath)) {
            fs.unlinkSync(sqlitePath);
          }
          logDebug(`[AutoBackup] Pruned old backup: ${item.name}`);
        } catch (e) {}
      }
    }
  } catch (err) {
    logDebug(`[AutoBackup] Error pruning old backups: ${err.message}`);
  }
}

function fetchJsonBackup() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/backup/export`, { timeout: 6000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse backup JSON: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Backup request timed out'));
    });
  });
}

function checkpointDatabase() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: BACKEND_PORT,
      path: '/api/backup/checkpoint',
      method: 'POST',
      timeout: 3000
    }, () => resolve(true));
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function performAutoBackup(isManual = false) {
  try {
    logDebug(`[AutoBackup] Starting ${isManual ? 'manual' : 'scheduled weekly'} backup...`);
    const backupDir = getBackupDirectory();

    // 1. Checkpoint SQLite database so all WAL writes are flushed
    await checkpointDatabase();

    // 2. Fetch full JSON backup data from backend
    const backupData = await fetchJsonBackup();

    // 3. Format timestamp: YYYY-MM-DD_HH-mm-ss
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    const jsonFileName = `smarttech_backup_${timestampStr}.json`;
    const jsonFilePath = path.join(backupDir, jsonFileName);
    fs.writeFileSync(jsonFilePath, JSON.stringify(backupData, null, 2), 'utf8');

    // 4. Also copy the binary SQLite database file
    const dbPath = resolveDatabasePath();
    let sqliteFileName = null;
    if (fs.existsSync(dbPath)) {
      sqliteFileName = `smarttech_database_${timestampStr}.sqlite`;
      const sqliteFilePath = path.join(backupDir, sqliteFileName);
      fs.copyFileSync(dbPath, sqliteFilePath);
    }

    // 5. Update metadata
    const meta = {
      lastBackupTime: now.getTime(),
      lastBackupDate: now.toISOString(),
      lastJsonFile: jsonFileName,
      lastSqliteFile: sqliteFileName,
      folderPath: backupDir,
      intervalDays: 7,
      status: 'active'
    };
    saveBackupMetadata(meta);

    // 6. Cleanup older backups (keep last 12 weeks)
    cleanupOldBackups(backupDir, 12);

    logDebug(`[AutoBackup] Backup completed successfully. Saved to: ${backupDir}`);

    // 7. Notify renderer window if available
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auto-backup-completed', {
        success: true,
        date: now.toISOString(),
        jsonFile: jsonFileName,
        sqliteFile: sqliteFileName,
        folderPath: backupDir,
        isManual
      });
    }

    return {
      success: true,
      date: now.toISOString(),
      jsonFile: jsonFileName,
      sqliteFile: sqliteFileName,
      folderPath: backupDir,
      isManual
    };
  } catch (err) {
    logDebug(`[AutoBackup] Failed to perform backup: ${err.message}`);
    return {
      success: false,
      error: err.message
    };
  }
}

async function checkAndRunScheduledBackup() {
  const meta = getBackupMetadata();
  const now = Date.now();
  const timeSinceLast = now - (meta.lastBackupTime || 0);

  if (timeSinceLast >= WEEK_IN_MS) {
    const daysSince = meta.lastBackupTime ? Math.round(timeSinceLast / (24 * 3600 * 1000)) : 'first time';
    logDebug(`[AutoBackup] Scheduled weekly backup is due (${daysSince}). Triggering backup now...`);
    await performAutoBackup(false);
  } else {
    const daysLeft = Math.ceil((WEEK_IN_MS - timeSinceLast) / (24 * 3600 * 1000));
    logDebug(`[AutoBackup] Backup is up to date. Next scheduled backup in approx ${daysLeft} day(s).`);
  }
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

// Auto-backup IPC handlers
ipcMain.handle('trigger-auto-backup', async () => {
  return await performAutoBackup(true);
});

ipcMain.handle('open-backup-folder', async () => {
  const dir = getBackupDirectory();
  await shell.openPath(dir);
  return dir;
});

ipcMain.handle('get-backup-status', () => {
  const meta = getBackupMetadata();
  const now = Date.now();
  const timeSinceLast = now - (meta.lastBackupTime || 0);
  const isDue = timeSinceLast >= WEEK_IN_MS;
  const daysUntilNext = Math.max(0, Math.ceil((WEEK_IN_MS - timeSinceLast) / (24 * 3600 * 1000)));

  return {
    ...meta,
    isDue,
    daysUntilNext,
    backupDir: getBackupDirectory()
  };
});

app.whenReady().then(async () => {
  logDebug('app.whenReady() resolved');
  
  // 1. Initialize embedded backend server first (takes < 300ms)
  await ensureBackendServer();

  // 2. Open desktop window and load application directly
  createWindow();

  // 3. Start Weekly Database Auto-Backup Service
  setTimeout(() => {
    checkAndRunScheduledBackup().catch(e => {
      logDebug(`[AutoBackup Startup Error]: ${e.message}`);
    });
  }, 3500);

  // Periodic check every 6 hours while desktop app is open
  setInterval(() => {
    checkAndRunScheduledBackup().catch(e => {
      logDebug(`[AutoBackup Periodic Error]: ${e.message}`);
    });
  }, 6 * 60 * 60 * 1000);

  // Second-instance handler: when user clicks desktop icon or runs exe again, focus existing window
  app.on('second-instance', () => {
    logDebug('second-instance event received. Focusing existing window.');
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

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
    // Guarantee clean exit so NSIS portable wrapper or Windows handles do not hang
    setTimeout(() => {
      process.exit(0);
    }, 300);
  }
});
