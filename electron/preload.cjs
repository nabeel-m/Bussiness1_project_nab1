const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  printDocument: () => ipcRenderer.send('print-document'),
  printToPDF: () => ipcRenderer.invoke('print-to-pdf'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  triggerAutoBackup: () => ipcRenderer.invoke('trigger-auto-backup'),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),
  getBackupStatus: () => ipcRenderer.invoke('get-backup-status'),
  onAutoBackupCompleted: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('auto-backup-completed', listener);
    return () => ipcRenderer.removeListener('auto-backup-completed', listener);
  }
});
