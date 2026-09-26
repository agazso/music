// hands the frontend the local server address and credentials so it can log in silently
const { contextBridge, ipcRenderer } = require('electron');
const arg = process.argv.find((a) => a.startsWith('--desktop='));
if (arg) contextBridge.exposeInMainWorld('desktop', { ...JSON.parse(arg.slice('--desktop='.length)), lanIp: () => ipcRenderer.invoke('lan-ip') });
