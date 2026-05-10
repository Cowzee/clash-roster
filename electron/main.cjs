const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('node:path')
const { HasagiClient } = require('@hasagi/core')
const { existsSync, readFileSync } = require('node:fs')
// import '../node_modules/@hasagi/core/types/lcu-types.d.ts'

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


ipcMain.handle('league-get-player-roster', async () => {


  try {
    const curTournaments = await client.request("get", "/lol-clash/v1/currentTournamentIds");
    if (!curTournaments || curTournaments.length === 0) return null;

    const tournamentInfo = await client.request("get", "/lol-clash/v1/tournament/" + curTournaments[0] + "/player");
    const rosterInfo = await client.request("get", "/lol-clash/v1/roster/" + tournamentInfo.rosterId);
    const summoners = [];

    for (const member of rosterInfo.members) {
      const summonerInfo = await client.request("get", "/lol-summoner/v1/summoners/" + member.summonerId);
      if (summonerInfo?.gameName && summonerInfo?.tagLine) {
        summoners.push(summonerInfo.gameName + "-" + summonerInfo.tagLine);
      }


    }
    // console.log(summoners);
    return summoners;
    
  } catch (error) {
    return null;
  }



});
ipcMain.handle('league-get-bracket', async () => {
  const teams = [];
  const matchesFormatted = [];

  try {
    const curTournaments = await client.request("get", "/lol-clash/v1/currentTournamentIds");
    if (!curTournaments || curTournaments.length === 0) return null;

    const tournamentInfo = await client.request("get", "/lol-clash/v1/tournament/" + curTournaments[0] + "/player");
    const bracketInfo = await client.request("get", "/lol-clash/v1/bracket/" + tournamentInfo.bracketId);

    for (const roster of bracketInfo.rosters) {
      const rosterInfo = await client.request("get", "/lol-clash/v1/roster/" + roster.rosterId);
      const summoners = [];

      for (const member of rosterInfo.members) {
        const summonerInfo = await client.request("get", "/lol-summoner/v1/summoners/" + member.summonerId);
        if (summonerInfo?.gameName && summonerInfo?.tagLine) {
          summoners.push(summonerInfo.gameName + "-" + summonerInfo.tagLine);
        }
      }

      teams.push({
        id: roster.rosterId,
        name: rosterInfo.name,
        shortName: rosterInfo.shortName,
        members: summoners
      });
    }

    for (const match of bracketInfo.matches) {
      matchesFormatted.push({
        id1: match.rosterId1,
        id2: match.rosterId2,
        order: match.order
      });
    }

    return { teams, matches: matchesFormatted };
  } catch (error) {
    console.log(error);
    return null;
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
    // console.log('Summoner data:', summoner)
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
