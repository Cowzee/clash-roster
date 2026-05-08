import 'bootstrap/dist/css/bootstrap.min.css'
import './style.css'

declare global {
    interface Window {
        leagueApi: {
            connect: () => Promise<{ port: number | null }>;
            isConnected: () => Promise<boolean>;
            getPort: () => Promise<number | null>;
            checkConnection: () => Promise<boolean>;
            getSummonerName: () => Promise<string | null>;
        };
    }
}

const resultsSection = document.getElementById('results');
const searchButton = document.getElementById('search');
const summonerNameHeader = document.getElementById("summonerName");

const isApiAvailable = () => typeof window.leagueApi !== 'undefined';

const updateConnectionStatus = async () => {
    if (!resultsSection) {
        return;
    }

    if (!isApiAvailable()) {
        resultsSection.textContent = 'Electron API unavailable';
        return;
    }

    try {
        const connected = await window.leagueApi.isConnected();
        const alive = connected ? await window.leagueApi.checkConnection() : false;

        if (!alive) {
            await window.leagueApi.connect();
        }

        const port = await window.leagueApi.getPort();
        resultsSection.textContent = port
            ? `Connected to League on port ${port}`
            : 'Connected to League';

        const summonerName = await window.leagueApi.getSummonerName();
        if (summonerNameHeader) {
            summonerNameHeader.textContent = summonerName || 'Not logged in';
        }
    } catch {
        resultsSection.textContent = 'League client not available';
        if (summonerNameHeader) {
            summonerNameHeader.textContent = '';
        }
    }
};

if (searchButton) {
    searchButton.addEventListener('click', updateConnectionStatus);
}

updateConnectionStatus();
setInterval(updateConnectionStatus, 5000);







