import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  startPTT: () => ipcRenderer.invoke('start-ptt'),
  stopPTT: () => ipcRenderer.invoke('stop-ptt'),
})

export {}
