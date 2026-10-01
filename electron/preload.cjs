const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  printDocument: () => ipcRenderer.send('print-document'),
  printToPDF: () => ipcRenderer.invoke('print-to-pdf'),
  openExternal: (url) => ipcRenderer.send('open-external', url)
});
