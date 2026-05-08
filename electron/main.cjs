const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('node:path')
const { HasagiClient } = require('@hasagi/core')
const { existsSync, readFileSync } = require('node:fs')

const lockfilePath = 'C:/Riot Games/League of Legends/lockfile'
const client = new HasagiClient()

function getCredentialsFromLockfile() {
  if (!existsSync(lockfilePath)) {
    return null
  }

  const contents = readFileSync(lockfilePath, 'utf8').trim()
  const parts = contents.split(':')
  if (parts.length < 4) {
    return null
  }

  const [, , port, password] = parts
  if (!port || !password) {
    return null
  }

  return {
    port: Number(port),
    password,
  }
}

function getConnectionOptions() {
  const credentials = getCredentialsFromLockfile()
  if (credentials) {
    return {
      authenticationStrategy: 'manual',
      credentials,
      maxConnectionAttempts: 3,
      connectionAttemptDelay: 1000,
      useWebSocket: false,
    }
  }

  return {
    authenticationStrategy: 'process',
    maxConnectionAttempts: 3,
    connectionAttemptDelay: 1000,
    useWebSocket: false,
  }
}

async function connectToLeague() {
  await client.connect(getConnectionOptions())
  return {
    port: client.getPort(),
  }
}

ipcMain.handle('league-connect', async () => {
  return await connectToLeague()
})

ipcMain.handle('league-is-connected', () => {
  return client.isConnected
})

ipcMain.handle('league-get-port', () => {
  return client.getPort()
})

ipcMain.handle('league-check', async () => {
  if (!client.isConnected) {
    return false
  }

  try {
    await client.request('get', '/lol-summoner/v1/current-summoner', {
      retryOptions: {
        maxRetries: 0,
        retryDelay: 0,
      },
    })
    return true
  } catch {
    return false
  }
})

ipcMain.handle('league-get-summoner', async () => {
  if (!client.isConnected) {
    console.log('League client not connected')
    return null
  }

  try {
    const summoner = await client.request('get', '/lol-summoner/v1/current-summoner', {
      retryOptions: {
        maxRetries: 0,
        retryDelay: 0,
      },
    })
    console.log('Summoner data:', summoner)
    return summoner.gameName && summoner.gameName.trim() ? summoner.gameName : null
  } catch (error) {
    console.log('Error fetching summoner:', error.message)
    return null
  }
})

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 720,
    minHeight: 480,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (app.isPackaged) {
    window.loadFile(path.join(__dirname, '../dist/index.html'))
  } else {
    window.loadURL('http://127.0.0.1:5173')
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
