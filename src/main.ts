import 'bootstrap/dist/css/bootstrap.min.css'
import './style.css'

declare global {
    interface Team {
        id: number;
        name: string;
        shortName: string;
        members: string[];
    }

    interface Match {
        id1: string;
        id2: string;
        order: number;
    }

    interface Bracket {
        teams: Team[];
        matches: Match[];
    }

    interface LeagueApi {
        connect: () => Promise<{ port: number | null }>;
        isConnected: () => Promise<boolean>;
        getPort: () => Promise<number | null>;
        checkConnection: () => Promise<boolean>;
        getSummonerName: () => Promise<string | null>;
        getBracket: () => Promise<Bracket | null>;
        getPlayerRoster: () => Promise<string[] | null>;
    }

    interface Window {
        leagueApi: LeagueApi;
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

const updateBracketInfo = async () => {
    const bracket = await window.leagueApi.getBracket();
    const bracketTeamSection = document.getElementById('bracketTeam');
    const bracketSection = document.getElementById('bracketSection');
    if (bracketTeamSection) {
        bracketTeamSection.innerHTML = '';  
        const playerRoster = await window.leagueApi.getPlayerRoster();
        if (Boolean(playerRoster)) {
            bracketTeamSection.innerHTML += "Members in your Team (Sometimes Includes Invites)" +  playerRoster!.join(", ");
        }
    }
    if (bracket) {

        if (bracketSection) {


            bracket.teams.forEach(team => {
                const card = document.createElement('div');
                card.className = 'card mb-3';
                card.innerHTML = `<div class="card-body"><h5 class="card-title">${team.name}</h5><p class="card-text">${team.shortName}</p></div>`;
                card.onclick = () => {
                    var address = "https://u.gg/lol/multisearch?summoners=" + team.members.join(",") + "&region=na1";
                    window.open(address, '_blank')?.focus();
                };
                bracketSection.appendChild(card);
            });

            if (searchButton){
                searchButton.style.visibility = "false";
                (searchButton as HTMLButtonElement).disabled = true;
            }
           
        }
    }
    else {
        if (bracketSection) {
            bracketSection.innerHTML += "NA";
        }
    }
}


if (searchButton) {
    searchButton.addEventListener('click', updateBracketInfo);
}

updateConnectionStatus();
setInterval(updateConnectionStatus, 5000);







