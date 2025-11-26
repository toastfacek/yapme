"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  startPTT: () => electron.ipcRenderer.invoke("start-ptt"),
  stopPTT: () => electron.ipcRenderer.invoke("stop-ptt")
});
