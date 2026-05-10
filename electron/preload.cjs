const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('leagueApi', {
  connect: () => ipcRenderer.invoke('league-connect'),
  isConnected: () => ipcRenderer.invoke('league-is-connected'),
  getPort: () => ipcRenderer.invoke('league-get-port'),
  checkConnection: () => ipcRenderer.invoke('league-check'),
  getSummonerName: () => ipcRenderer.invoke('league-get-summoner'),
  getBracket: () => ipcRenderer.invoke('league-get-bracket'),
  getPlayerRoster: () => ipcRenderer.invoke('league-get-player-roster')
});
