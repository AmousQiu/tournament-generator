// Tournament Generator - Main Application Logic

let nextId = 1;

let state = {
    players: [],
    type: "",
    rounds: [],
    note: "",
    swiss: { maxRounds: 0 },
    double: { losses: {} }
};

const ui = {
    setupSection: null,
    bracketSection: null,
    playerCount: null,
    playerNames: null,
    typeSelect: null,
    bracketDisplay: null,
    standingsDisplay: null,
    note: null,
    title: null,
    importFile: null
};

document.addEventListener("DOMContentLoaded", () => {
    ui.setupSection = document.getElementById("setup-section");
    ui.bracketSection = document.getElementById("bracket-section");
    ui.playerCount = document.getElementById("player-count");
    ui.playerNames = document.getElementById("player-names");
    ui.typeSelect = document.getElementById("tournament-type");
    ui.bracketDisplay = document.getElementById("bracket-display");
    ui.standingsDisplay = document.getElementById("standings-display");
    ui.note = document.getElementById("tournament-note");
    ui.title = document.getElementById("view-title");
    ui.importFile = document.getElementById("import-file");

    document.getElementById("generate-player-fields").addEventListener("click", generatePlayerFields);
    document.getElementById("generate-bracket").addEventListener("click", generateTournament);
    document.getElementById("export-btn").addEventListener("click", exportTournament);
    document.getElementById("import-btn").addEventListener("click", () => ui.importFile.click());
    document.getElementById("reset-btn").addEventListener("click", resetTournament);
    ui.importFile.addEventListener("change", importTournament);

    generatePlayerFields();
});

function uid() {
    const id = nextId;
    nextId += 1;
    return id;
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

function isRealPlayerId(id) {
    return typeof id === "number" && id > 0;
}

function getPlayerName(id) {
    if (id === null) return "BYE";
    if (id === undefined) return "TBD";
    const p = state.players.find((player) => player.id === id);
    return p ? p.name : "TBD";
}

function generatePlayerFields() {
    const count = clamp(parseInt(ui.playerCount.value, 10) || 4, 2, 32);
    ui.playerCount.value = String(count);
    ui.playerNames.innerHTML = "";

    for (let i = 1; i <= count; i += 1) {
        const row = document.createElement("div");
        row.className = "player-field";
        row.innerHTML = `
            <label for="player-${i}">Player ${i}</label>
            <input type="text" id="player-${i}" placeholder="Name" maxlength="24">
        `;
        ui.playerNames.appendChild(row);
    }
}

function collectPlayers() {
    const inputs = ui.playerNames.querySelectorAll("input");
    const players = [];
    let id = 1;
    inputs.forEach((input) => {
        const name = input.value.trim();
        if (name) {
            players.push({ id, name });
            id += 1;
        }
    });
    return players;
}

function generateTournament() {
    const players = collectPlayers();
    if (players.length < 2) {
        alert("Add at least two player names.");
        return;
    }

    state = {
        players,
        type: ui.typeSelect.value,
        rounds: [],
        note: "",
        swiss: { maxRounds: 0 },
        double: { losses: {} }
    };

    if (state.type === "single") {
        state.rounds = buildSingleElimination(players);
        state.note = "Single elimination: lose once and you are out.";
    } else if (state.type === "double") {
        state.rounds = [buildDoubleRound(players, {})];
        players.forEach((p) => {
            state.double.losses[p.id] = 0;
        });
        state.note = "Double elimination: players are out after 2 losses.";
    } else if (state.type === "round-robin") {
        state.rounds = buildRoundRobin(players);
        state.note = "Round robin: everyone plays everyone once.";
    } else {
        state.swiss.maxRounds = Math.ceil(Math.log2(players.length)) + 1;
        state.rounds = [buildSwissRound(players, [])];
        state.note = `Swiss system: ${state.swiss.maxRounds} rounds total.`;
    }

    ui.setupSection.classList.add("hidden");
    ui.bracketSection.classList.remove("hidden");
    render();
}

function buildSingleElimination(players) {
    const bracketSize = 2 ** Math.ceil(Math.log2(players.length));
    const roundCount = Math.log2(bracketSize);
    const rounds = [];

    const byes = bracketSize - players.length;
    const firstSlots = new Array(bracketSize).fill(null);
    for (let i = 0; i < players.length; i += 1) {
        if (i < byes) {
            firstSlots[i * 2] = players[i].id;
        } else {
            const offset = byes * 2 + (i - byes);
            firstSlots[offset] = players[i].id;
        }
    }

    for (let r = 0; r < roundCount; r += 1) {
        const matchesInRound = bracketSize / (2 ** (r + 1));
        const round = [];
        for (let i = 0; i < matchesInRound; i += 1) {
            round.push({
                id: uid(),
                roundIndex: r,
                indexInRound: i,
                p1Id: r === 0 ? firstSlots[i * 2] : undefined,
                p2Id: r === 0 ? firstSlots[i * 2 + 1] : undefined,
                score1: null,
                score2: null,
                winnerId: null,
                loserId: null,
                completed: false,
                nextMatchId: null,
                nextSlot: null
            });
        }
        rounds.push(round);
    }

    for (let r = 0; r < rounds.length - 1; r += 1) {
        rounds[r].forEach((match, i) => {
            const next = rounds[r + 1][Math.floor(i / 2)];
            match.nextMatchId = next.id;
            match.nextSlot = i % 2 === 0 ? "p1Id" : "p2Id";
        });
    }

    rounds[0].forEach((match) => resolveAutoAdvance(match, rounds));
    return rounds;
}

function buildRoundRobin(players) {
    const rounds = [];
    const list = players.length % 2 === 0 ? [...players] : [...players, { id: null, name: "BYE" }];
    const size = list.length;
    const roundsCount = size - 1;
    let arr = [...list];

    for (let r = 0; r < roundsCount; r += 1) {
        const round = [];
        for (let i = 0; i < size / 2; i += 1) {
            const a = arr[i];
            const b = arr[size - 1 - i];
            if (!a.id || !b.id) continue;
            round.push({
                id: uid(),
                roundIndex: r,
                indexInRound: i,
                p1Id: a.id,
                p2Id: b.id,
                score1: null,
                score2: null,
                winnerId: null,
                loserId: null,
                completed: false,
                nextMatchId: null,
                nextSlot: null
            });
        }
        rounds.push(round);
        arr = [arr[0], arr[size - 1], ...arr.slice(1, size - 1)];
    }

    return rounds;
}

function buildSwissRound(players, priorRounds) {
    const standings = calculateStandings(priorRounds, players, "swiss");
    const sorted = standings.map((row) => row.id);
    const pairedSet = new Set();
    const priorPairs = new Set();
    priorRounds.forEach((round) => {
        round.forEach((m) => {
            const key = [m.p1Id, m.p2Id].sort((a, b) => a - b).join(":");
            priorPairs.add(key);
        });
    });

    const matches = [];
    for (let i = 0; i < sorted.length; i += 1) {
        const p1 = sorted[i];
        if (pairedSet.has(p1)) continue;

        let partner = null;
        for (let j = i + 1; j < sorted.length; j += 1) {
            const candidate = sorted[j];
            if (pairedSet.has(candidate)) continue;
            const key = [p1, candidate].sort((a, b) => a - b).join(":");
            if (!priorPairs.has(key)) {
                partner = candidate;
                break;
            }
        }

        if (partner === null) {
            for (let j = i + 1; j < sorted.length; j += 1) {
                const candidate = sorted[j];
                if (!pairedSet.has(candidate)) {
                    partner = candidate;
                    break;
                }
            }
        }

        pairedSet.add(p1);
        if (partner !== null) pairedSet.add(partner);

        matches.push({
            id: uid(),
            roundIndex: priorRounds.length,
            indexInRound: matches.length,
            p1Id: p1,
            p2Id: partner,
            score1: partner === null ? 1 : null,
            score2: partner === null ? 0 : null,
            winnerId: partner === null ? p1 : null,
            loserId: partner === null ? null : null,
            completed: partner === null,
            nextMatchId: null,
            nextSlot: null
        });
    }

    return matches;
}

function buildDoubleRound(players, losses) {
    const survivors = players.filter((p) => (losses[p.id] || 0) < 2).map((p) => p.id);
    survivors.sort((a, b) => {
        const lossA = losses[a] || 0;
        const lossB = losses[b] || 0;
        if (lossA !== lossB) return lossA - lossB;
        return a - b;
    });

    const used = new Set();
    const matches = [];

    for (let i = 0; i < survivors.length; i += 1) {
        const p1 = survivors[i];
        if (used.has(p1)) continue;

        let partner = null;
        for (let j = i + 1; j < survivors.length; j += 1) {
            const p2 = survivors[j];
            if (used.has(p2)) continue;
            if ((losses[p2] || 0) === (losses[p1] || 0)) {
                partner = p2;
                break;
            }
        }

        if (partner === null) {
            for (let j = i + 1; j < survivors.length; j += 1) {
                const p2 = survivors[j];
                if (!used.has(p2)) {
                    partner = p2;
                    break;
                }
            }
        }

        used.add(p1);
        if (partner !== null) used.add(partner);

        matches.push({
            id: uid(),
            roundIndex: 0,
            indexInRound: matches.length,
            p1Id: p1,
            p2Id: partner,
            score1: partner === null ? 1 : null,
            score2: partner === null ? 0 : null,
            winnerId: partner === null ? p1 : null,
            loserId: partner === null ? null : null,
            completed: partner === null,
            nextMatchId: null,
            nextSlot: null
        });
    }

    return matches;
}

function findMatch(matchId) {
    for (const round of state.rounds) {
        const found = round.find((m) => m.id === matchId);
        if (found) return found;
    }
    return null;
}

function findMatchById(rounds, matchId) {
    for (const round of rounds) {
        const found = round.find((m) => m.id === matchId);
        if (found) return found;
    }
    return null;
}

function resolveAutoAdvance(match, rounds) {
    if (match.completed) return;

    const p1Known = match.p1Id !== undefined;
    const p2Known = match.p2Id !== undefined;
    if (!p1Known || !p2Known) return;

    if (match.p1Id === null && match.p2Id === null) {
        match.completed = true;
        match.winnerId = null;
        match.loserId = null;
        return;
    }

    if (isRealPlayerId(match.p1Id) && match.p2Id === null) {
        match.completed = true;
        match.winnerId = match.p1Id;
        match.loserId = null;
        propagateWinner(match, rounds);
        return;
    }

    if (isRealPlayerId(match.p2Id) && match.p1Id === null) {
        match.completed = true;
        match.winnerId = match.p2Id;
        match.loserId = match.p1Id;
        propagateWinner(match, rounds);
    }
}

function propagateWinner(match, rounds) {
    if (!match.nextMatchId || !match.nextSlot) return;
    const next = findMatchById(rounds, match.nextMatchId);
    if (!next) return;

    next[match.nextSlot] = match.winnerId;
    resolveAutoAdvance(next, rounds);
}

function openScoreModal(matchId) {
    const match = findMatch(matchId);
    if (!match || match.completed) return;
    if (!isRealPlayerId(match.p1Id) || !isRealPlayerId(match.p2Id)) return;

    const overlay = document.createElement("div");
    overlay.className = "score-overlay";
    overlay.innerHTML = `
        <div class="score-card">
            <h4>Enter score</h4>
            <div class="score-grid">
                <label>${getPlayerName(match.p1Id)}</label>
                <input type="number" min="0" step="1" id="score-a" />
            </div>
            <div class="score-grid">
                <label>${getPlayerName(match.p2Id)}</label>
                <input type="number" min="0" step="1" id="score-b" />
            </div>
            <div class="score-actions">
                <button class="cancel" type="button">Cancel</button>
                <button class="save" type="button">Save</button>
            </div>
        </div>
    `;

    const close = () => overlay.remove();
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });
    overlay.querySelector(".cancel").addEventListener("click", close);

    overlay.querySelector(".save").addEventListener("click", () => {
        const a = parseInt(overlay.querySelector("#score-a").value, 10);
        const b = parseInt(overlay.querySelector("#score-b").value, 10);

        if (Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0) {
            alert("Scores must be non-negative numbers.");
            return;
        }

        if ((state.type === "single" || state.type === "double") && a === b) {
            alert("Elimination matches cannot end in a draw.");
            return;
        }

        finalizeMatch(match, a, b);
        close();
        render();
    });

    document.body.appendChild(overlay);
    overlay.querySelector("#score-a").focus();
}

function finalizeMatch(match, score1, score2) {
    match.score1 = score1;
    match.score2 = score2;
    match.completed = true;

    if (score1 > score2) {
        match.winnerId = match.p1Id;
        match.loserId = match.p2Id;
    } else if (score2 > score1) {
        match.winnerId = match.p2Id;
        match.loserId = match.p1Id;
    } else {
        match.winnerId = null;
        match.loserId = null;
    }

    if (state.type === "single" || state.type === "double") {
        if (state.type === "single") {
            propagateWinner(match, state.rounds);
        } else {
            if (isRealPlayerId(match.loserId)) {
                state.double.losses[match.loserId] = (state.double.losses[match.loserId] || 0) + 1;
            }

            const currentRound = state.rounds[state.rounds.length - 1];
            const allDone = currentRound.every((m) => m.completed);
            if (allDone) {
                const alive = state.players.filter((p) => (state.double.losses[p.id] || 0) < 2);
                if (alive.length > 1) {
                    const nextRound = buildDoubleRound(state.players, state.double.losses);
                    if (nextRound.length > 0) {
                        nextRound.forEach((m, idx) => {
                            m.roundIndex = state.rounds.length;
                            m.indexInRound = idx;
                        });
                        state.rounds.push(nextRound);
                    }
                }
            }
        }
    }

    if (state.type === "swiss") {
        const lastRound = state.rounds[state.rounds.length - 1];
        const allComplete = lastRound.length > 0 && lastRound.every((m) => m.completed);
        if (allComplete && state.rounds.length < state.swiss.maxRounds) {
            const nextRound = buildSwissRound(state.players, state.rounds);
            if (nextRound.length > 0) {
                state.rounds.push(nextRound);
            }
        }
    }
}

function calculateStandings(rounds, players, mode) {
    const map = new Map();
    players.forEach((p) => {
        map.set(p.id, {
            id: p.id,
            name: p.name,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            scored: 0,
            conceded: 0,
            points: 0
        });
    });

    rounds.forEach((round) => {
        round.forEach((m) => {
            if (!m.completed) return;

            if (isRealPlayerId(m.p1Id) && m.p2Id === null) {
                const aBye = map.get(m.p1Id);
                if (!aBye) return;
                aBye.played += 1;
                aBye.wins += 1;
                aBye.scored += m.score1 ?? 1;
                aBye.points += mode === "swiss" ? 1 : 3;
                return;
            }

            if (isRealPlayerId(m.p2Id) && m.p1Id === null) {
                const bBye = map.get(m.p2Id);
                if (!bBye) return;
                bBye.played += 1;
                bBye.wins += 1;
                bBye.scored += m.score2 ?? 1;
                bBye.points += mode === "swiss" ? 1 : 3;
                return;
            }

            if (!isRealPlayerId(m.p1Id) || !isRealPlayerId(m.p2Id)) return;

            const a = map.get(m.p1Id);
            const b = map.get(m.p2Id);
            if (!a || !b) return;

            a.played += 1;
            b.played += 1;
            a.scored += m.score1;
            b.scored += m.score2;
            a.conceded += m.score2;
            b.conceded += m.score1;

            if (m.score1 > m.score2) {
                a.wins += 1;
                b.losses += 1;
                a.points += mode === "swiss" ? 1 : 3;
            } else if (m.score2 > m.score1) {
                b.wins += 1;
                a.losses += 1;
                b.points += mode === "swiss" ? 1 : 3;
            } else {
                a.draws += 1;
                b.draws += 1;
                if (mode !== "single" && mode !== "double") {
                    a.points += 0.5;
                    b.points += 0.5;
                }
            }
        });
    });

    const list = [...map.values()];
    list.sort((x, y) => {
        if (y.points !== x.points) return y.points - x.points;
        const xDiff = x.scored - x.conceded;
        const yDiff = y.scored - y.conceded;
        if (yDiff !== xDiff) return yDiff - xDiff;
        return y.scored - x.scored;
    });
    return list;
}

function render() {
    ui.note.textContent = state.note;
    ui.standingsDisplay.innerHTML = "";
    ui.bracketDisplay.innerHTML = "";

    if (state.type === "single") ui.title.textContent = "Single Elimination";
    if (state.type === "double") ui.title.textContent = "Double Elimination";
    if (state.type === "round-robin") ui.title.textContent = "Round Robin";
    if (state.type === "swiss") ui.title.textContent = "Swiss System";

    // Clear and prepare bracket display
    ui.bracketDisplay.innerHTML = '';
    const bracketContainer = document.createElement('div');
    bracketContainer.className = 'bracket-container';
    ui.bracketDisplay.appendChild(bracketContainer);

    if (state.type === "single" || state.type === "double") {
        renderBracket(bracketContainer);
    } else {
        // For round-robin and swiss, use the simple list view
        renderSimpleBracket(bracketContainer);
    }

    if (state.type === "double") {
        const alive = state.players.filter((p) => (state.double.losses[p.id] || 0) < 2);
        if (alive.length === 1) {
            ui.note.textContent = `Champion: ${alive[0].name}`;
        }
    }

    if (state.type === "round-robin" || state.type === "swiss") {
        renderStandings();
    }
}

function renderBracket(container) {
    if (state.rounds.length === 0) return;
    
    // Create SVG for bracket lines
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.className = "bracket-lines";
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    container.appendChild(svg);
    
    // Create container for match elements
    const matchesContainer = document.createElement('div');
    matchesContainer.className = 'matches-container';
    matchesContainer.style.position = "relative";
    matchesContainer.style.zIndex = "10";
    container.appendChild(matchesContainer);
    
    // Calculate dimensions
    const roundCount = state.rounds.length;
    const roundGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--round-gap')) || 140;
    const verticalGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--vertical-gap')) || 50;
    const matchWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--match-width')) || 200;
    const matchHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--match-height')) || 90;
    
    // Position each round
    state.rounds.forEach((round, roundIndex) => {
        const roundGroup = document.createElement('div');
        roundGroup.className = 'round-group';
        roundGroup.style.position = 'absolute';
        roundGroup.style.left = `${roundIndex * (matchWidth + roundGap)}px`;
        matchesContainer.appendChild(roundGroup);
        
        // Position matches in this round
        round.forEach((match, matchIndex) => {
            const matchEl = document.createElement('div');
            matchEl.className = `match ${match.completed ? 'completed' : ''}`;
            matchEl.dataset.matchId = match.id;
            
            // Calculate vertical position
            const spacing = verticalGap * 2; // Space between match slots
            const baseOffset = (matchIndex * 2 + 1) * spacing; // Account for byes/empty slots
            matchEl.style.top = `${baseOffset}px`;
            
            // Get player names
            const p1Name = getPlayerName(match.p1Id);
            const p2Name = getPlayerName(match.p2Id);
            const p1Winner = match.completed && match.winnerId === match.p1Id;
            const p2Winner = match.completed && match.winnerId === match.p2Id;
            const clickable = !match.completed && isRealPlayerId(match.p1Id) && isRealPlayerId(match.p2Id);
            
            if (clickable) {
                matchEl.classList.add('clickable');
                matchEl.addEventListener('click', () => openScoreModal(match.id));
            }
            
            matchEl.innerHTML = `
                <div class="player-info">
                    <span class="player-name">${p1Name}</span>
                    <span class="player-score ${p1Winner ? 'winner' : ''}">${match.score1 !== null ? match.score1 : ''}</span>
                </div>
                <div class="versus">VS</div>
                <div class="player-info">
                    <span class="player-name">${p2Name}</span>
                    <span class="player-score ${p2Winner ? 'winner' : ''}">${match.score2 !== null ? match.score2 : ''}</span>
                </div>
                <div class="match-meta">${clickable ? 'Click to enter score' : match.completed ? 'Completed' : 'Waiting'}</div>
            `;
            
            roundGroup.appendChild(matchEl);
            
            // Draw connector lines to next round
            if (match.nextMatchId && match.nextSlot) {
                const nextMatch = findMatchById(state.rounds[roundIndex + 1] || [], match.nextMatchId);
                if (nextMatch) {
                    // Calculate line positions
                    const x1 = roundIndex * (matchWidth + roundGap) + matchWidth;
                    const y1 = baseOffset + (matchHeight / 2);
                    
                    let x2, y2;
                    if (match.nextSlot === 'p1Id') {
                        // Connect to top half of next match
                        x2 = (roundIndex + 1) * (matchWidth + roundGap);
                        y2 = (matchIndex * spacing * 2) + (matchHeight / 2);
                    } else {
                        // Connect to bottom half of next match
                        x2 = (roundIndex + 1) * (matchWidth + roundGap);
                        y2 = ((matchIndex * 2 + 1) * spacing * 2) + (matchHeight / 2);
                    }
                    
                    // Draw horizontal line from match to middle
                    const hLine1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    hLine1.setAttribute('x1', x1);
                    hLine1.setAttribute('y1', y1);
                    hLine1.setAttribute('x2', x1 + 20);
                    hLine1.setAttribute('y2', y1);
                    hLine1.setAttribute('stroke', 'var(--line)');
                    hLine1.setAttribute('stroke-width', '2');
                    svg.appendChild(hLine1);
                    
                    // Draw vertical line
                    const vLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    vLine.setAttribute('x1', x1 + 20);
                    vLine.setAttribute('y1', y1);
                    vLine.setAttribute('x2', x1 + 20);
                    vLine.setAttribute('y2', y2);
                    vLine.setAttribute('stroke', 'var(--line)');
                    vLine.setAttribute('stroke-width', '2');
                    svg.appendChild(vLine);
                    
                    // Draw horizontal line to next match
                    const hLine2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    hLine2.setAttribute('x1', x1 + 20);
                    hLine2.setAttribute('y2', y2);
                    hLine2.setAttribute('x2', x2);
                    hLine2.setAttribute('y2', y2);
                    hLine2.setAttribute('stroke', 'var(--line)');
                    hLine2.setAttribute('stroke-width', '2');
                    svg.appendChild(hLine2);
                }
            }
        });
    });
    
    // Set container height based on content
    const totalHeight = Math.round((Math.pow(2, state.rounds.length)) * verticalGap * 2);
    container.style.minHeight = `${totalHeight}px`;
}

function renderSimpleBracket(container) {
    // For round-robin and swiss, use the previous simple list view
    const grid = document.createElement("div");
    grid.className = "bracket-grid";

    state.rounds.forEach((round, idx) => {
        const col = document.createElement("div");
        col.className = "round-column";

        const title = document.createElement("h3");
        title.className = "round-title";
        title.textContent = `Round ${idx + 1}`;
        col.appendChild(title);

        round.forEach((m) => {
            const card = document.createElement("div");
            card.className = `match ${m.completed ? "completed" : ""}`;

            const p1Name = getPlayerName(m.p1Id);
            const p2Name = getPlayerName(m.p2Id);
            const p1Winner = m.completed && m.winnerId === m.p1Id;
            const p2Winner = m.completed && m.winnerId === m.p2Id;
            const clickable = !m.completed && isRealPlayerId(m.p1Id) && isRealPlayerId(m.p2Id);

            if (clickable) {
                card.classList.add("clickable");
                card.addEventListener("click", () => openScoreModal(m.id));
            }

            card.innerHTML = `
                <div class="player-row ${p1Winner ? "winner" : ""} ${m.p1Id === null ? "bye" : ""}">
                    <span>${p1Name}</span>
                    <strong>${m.score1 !== null ? m.score1 : ""}</strong>
                </div>
                <div class="player-row ${p2Winner ? "winner" : ""} ${m.p2Id === null ? "bye" : ""}">
                    <span>${p2Name}</span>
                    <strong>${m.score2 !== null ? m.score2 : ""}</strong>
                </div>
                <div class="match-meta">${clickable ? "Click to enter score" : m.completed ? "Completed" : "Waiting"}</div>
            `;

            col.appendChild(card);
        });

        grid.appendChild(col);
    });

    container.appendChild(grid);
}

function renderStandings() {
    const standings = calculateStandings(state.rounds, state.players, state.type);
    const wrap = document.createElement("div");
    wrap.className = "standings";
    wrap.innerHTML = `
        <h3>Standings</h3>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>P</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>GF</th>
                    <th>GA</th>
                    <th>Pts</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;

    const tbody = wrap.querySelector("tbody");
    standings.forEach((row, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${row.name}</td>
            <td>${row.played}</td>
            <td>${row.wins}</td>
            <td>${row.draws}</td>
            <td>${row.losses}</td>
            <td>${row.scored}</td>
            <td>${row.conceded}</td>
            <td>${row.points}</td>
        `;
        tbody.appendChild(tr);
    });
    ui.standingsDisplay.appendChild(wrap);
}

function exportTournament() {
    const payload = { state, nextId };
    const data = JSON.stringify(payload, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tournament.json";
    a.click();
    URL.revokeObjectURL(url);
}

function importTournament(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const payload = JSON.parse(e.target.result);
            if (!payload.state || !Array.isArray(payload.state.players) || !Array.isArray(payload.state.rounds)) {
                throw new Error("Invalid file format.");
            }

            state = payload.state;
            if (!state.double) state.double = { losses: {} };
            if (!state.swiss) state.swiss = { maxRounds: 0 };
            nextId = typeof payload.nextId === "number" ? payload.nextId : 1;
            ui.setupSection.classList.add("hidden");
            ui.bracketSection.classList.remove("hidden");
            render();
        } catch (err) {
            alert(`Import failed: ${err.message}`);
        }
    };

    reader.readAsText(file);
}

function resetTournament() {
    state = {
        players: [],
        type: "",
        rounds: [],
        note: "",
        swiss: { maxRounds: 0 },
        double: { losses: {} }
    };

    ui.setupSection.classList.remove("hidden");
    ui.bracketSection.classList.add("hidden");
    ui.standingsDisplay.innerHTML = "";
    generatePlayerFields();
}