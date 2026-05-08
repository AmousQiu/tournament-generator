// Tournament Generator - Main Application Logic

let nextId = 1;
const samplePlayerNames = [
    "Alex",
    "Jordan",
    "Taylor",
    "Casey",
    "Morgan",
    "Riley",
    "Jamie",
    "Avery",
    "Cameron",
    "Quinn",
    "Parker",
    "Skyler"
];

function createEmptyState() {
    return {
        players: [],
        type: "double",
        rounds: [],
        note: "",
        double: { losses: {} }
    };
}

let state = createEmptyState();

const ui = {
    setupSection: null,
    bracketSection: null,
    playerCount: null,
    playerNames: null,
    bracketDisplay: null,
    note: null,
    title: null,
    importFile: null
};

document.addEventListener("DOMContentLoaded", () => {
    ui.setupSection = document.getElementById("setup-section");
    ui.bracketSection = document.getElementById("bracket-section");
    ui.playerCount = document.getElementById("player-count");
    ui.playerNames = document.getElementById("player-names");
    ui.bracketDisplay = document.getElementById("bracket-display");
    ui.note = document.getElementById("tournament-note");
    ui.title = document.getElementById("view-title");
    ui.importFile = document.getElementById("import-file");

    document.getElementById("generate-player-fields").addEventListener("click", generatePlayerFields);
    document.getElementById("generate-bracket").addEventListener("click", generateTournament);
    document.getElementById("import-btn-setup").addEventListener("click", () => ui.importFile.click());
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

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
        if (char === "&") return "&amp;";
        if (char === "<") return "&lt;";
        if (char === ">") return "&gt;";
        if (char === "\"") return "&quot;";
        return "&#39;";
    });
}

function getSeedOrder(size) {
    let order = [1, 2];
    while (order.length < size) {
        const nextSize = order.length * 2;
        const next = [];
        order.forEach((seed) => {
            next.push(seed);
            next.push(nextSize + 1 - seed);
        });
        order = next;
    }
    return order;
}

function deriveDoubleLosses(players, rounds) {
    const losses = {};
    players.forEach((player) => {
        losses[player.id] = 0;
    });

    rounds.forEach((round) => {
        round.forEach((match) => {
            if (isRealPlayerId(match.loserId)) {
                losses[match.loserId] = (losses[match.loserId] || 0) + 1;
            }
        });
    });

    return losses;
}

function applyImportedRoundTitles(importedState) {
    const bracketSize = 2 ** Math.ceil(Math.log2(importedState.players.length));
    const winnersRoundCount = Math.log2(bracketSize);
    let cursor = 0;

    if (winnersRoundCount === 1) {
        if (importedState.rounds[cursor]) importedState.rounds[cursor].title = "Winners Final";
        if (importedState.rounds[cursor + 1]) importedState.rounds[cursor + 1].title = "Grand Final";
        if (importedState.rounds[cursor + 2]) importedState.rounds[cursor + 2].title = "Grand Final Reset";
        return;
    }

    if (importedState.rounds[cursor]) importedState.rounds[cursor].title = "Winners Round 1";
    cursor += 1;
    for (let block = 1; block < winnersRoundCount; block += 1) {
        if (importedState.rounds[cursor]) importedState.rounds[cursor].title = `Losers Round ${block * 2 - 1}`;
        if (importedState.rounds[cursor + 1]) {
            importedState.rounds[cursor + 1].title = block === winnersRoundCount - 1
                ? "Winners Final"
                : `Winners Round ${block + 1}`;
        }
        if (importedState.rounds[cursor + 2]) importedState.rounds[cursor + 2].title = `Losers Round ${block * 2}`;
        cursor += 3;
    }
    if (importedState.rounds[cursor]) importedState.rounds[cursor].title = "Grand Final";
    if (importedState.rounds[cursor + 1]) importedState.rounds[cursor + 1].title = "Grand Final Reset";
}

function normalizeImportedState(payload) {
    if (!payload || typeof payload !== "object" || !payload.state || typeof payload.state !== "object") {
        throw new Error("Invalid file format.");
    }

    const rawState = payload.state;
    if (rawState.type !== "double") {
        throw new Error("Only double-elimination tournaments can be imported.");
    }

    if (!Array.isArray(rawState.players) || !Array.isArray(rawState.rounds)) {
        throw new Error("Invalid file format.");
    }

    const players = rawState.players.map((player, index) => {
        if (!player || typeof player !== "object") {
            throw new Error(`Invalid player at index ${index}.`);
        }

        const id = Number(player.id);
        const name = typeof player.name === "string" ? player.name.trim() : "";
        if (!Number.isInteger(id) || id <= 0 || !name) {
            throw new Error(`Invalid player at index ${index}.`);
        }

        return { id, name };
    });

    const playerIds = new Set(players.map((player) => player.id));
    if (playerIds.size !== players.length) {
        throw new Error("Player IDs must be unique.");
    }

    const normalizeRef = (value, allowUndefined = false) => {
        if (value === undefined && allowUndefined) return undefined;
        if (value === null) return null;
        if (typeof value === "number" && playerIds.has(value)) return value;
        throw new Error("Imported match references an unknown player.");
    };

    const normalizeScore = (value) => {
        if (value === null || value === undefined || value === "") return null;
        if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
        throw new Error("Imported match has an invalid score.");
    };

    const rounds = rawState.rounds.map((round, roundIndex) => {
        if (!Array.isArray(round)) {
            throw new Error(`Invalid round at index ${roundIndex}.`);
        }

        return round.map((match, matchIndex) => {
            if (!match || typeof match !== "object") {
                throw new Error(`Invalid match at round ${roundIndex + 1}.`);
            }

            const p1Id = normalizeRef(match.p1Id, true);
            const p2Id = normalizeRef(match.p2Id, true);
            const score1 = normalizeScore(match.score1);
            const score2 = normalizeScore(match.score2);
            const completed = Boolean(match.completed);

            let winnerId = null;
            let loserId = null;

            if (completed) {
                if (isRealPlayerId(p1Id) && p2Id === null) {
                    winnerId = p1Id;
                } else if (isRealPlayerId(p2Id) && p1Id === null) {
                    winnerId = p2Id;
                } else if (isRealPlayerId(p1Id) && isRealPlayerId(p2Id) && score1 !== null && score2 !== null) {
                    if (score1 > score2) {
                        winnerId = p1Id;
                        loserId = p2Id;
                    } else if (score2 > score1) {
                        winnerId = p2Id;
                        loserId = p1Id;
                    }
                }
            }

            return {
                id: Number.isInteger(match.id) && match.id > 0 ? match.id : uid(),
                roundIndex: Number.isInteger(match.roundIndex) ? match.roundIndex : roundIndex,
                indexInRound: Number.isInteger(match.indexInRound) ? match.indexInRound : matchIndex,
                p1Id,
                p2Id,
                score1,
                score2,
                winnerId,
                loserId,
                completed,
                nextMatchId: match.nextMatchId === null || match.nextMatchId === undefined
                    ? null
                    : Number.isInteger(match.nextMatchId)
                        ? match.nextMatchId
                        : null,
                nextSlot: match.nextSlot === "p1Id" || match.nextSlot === "p2Id" ? match.nextSlot : null,
                loserNextMatchId: match.loserNextMatchId === null || match.loserNextMatchId === undefined
                    ? null
                    : Number.isInteger(match.loserNextMatchId)
                        ? match.loserNextMatchId
                        : null,
                loserNextSlot: match.loserNextSlot === "p1Id" || match.loserNextSlot === "p2Id" ? match.loserNextSlot : null,
                bracketRole: typeof match.bracketRole === "string" ? match.bracketRole : null
            };
        });
    });

    const importedState = createEmptyState();
    importedState.players = players;
    importedState.type = "double";
    importedState.rounds = rounds;
    importedState.note = typeof rawState.note === "string" ? rawState.note : "";
    importedState.double.losses = deriveDoubleLosses(players, rounds);
    applyImportedRoundTitles(importedState);

    nextId = Number.isInteger(payload.nextId) && payload.nextId > 0
        ? payload.nextId
        : Math.max(1, ...rounds.flat().map((match) => match.id + 1));

    return importedState;
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
            <input type="text" id="player-${i}" placeholder="${samplePlayerNames[(i - 1) % samplePlayerNames.length]}" maxlength="24">
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

    state = createEmptyState();
    state.players = players;
    state.rounds = buildDoubleElimination(players);
    players.forEach((player) => {
        state.double.losses[player.id] = 0;
    });
    state.note = "Double elimination: the full bracket is generated up front and updated as results come in.";

    ui.setupSection.classList.add("hidden");
    ui.bracketSection.classList.remove("hidden");
    render();
}

function createMatch(roundIndex, indexInRound, p1Id = undefined, p2Id = undefined, bracketRole = null) {
    return {
        id: uid(),
        roundIndex,
        indexInRound,
        p1Id,
        p2Id,
        score1: null,
        score2: null,
        winnerId: null,
        loserId: null,
        completed: false,
        nextMatchId: null,
        nextSlot: null,
        loserNextMatchId: null,
        loserNextSlot: null,
        bracketRole
    };
}

function createRound(title) {
    const round = [];
    round.title = title;
    return round;
}

function assignWinner(match, nextMatch, slot) {
    match.nextMatchId = nextMatch.id;
    match.nextSlot = slot;
}

function assignLoser(match, nextMatch, slot) {
    match.loserNextMatchId = nextMatch.id;
    match.loserNextSlot = slot;
}

function buildDoubleElimination(players) {
    const bracketSize = 2 ** Math.ceil(Math.log2(players.length));
    const winnersRoundCount = Math.log2(bracketSize);
    const firstSlots = getSeedOrder(bracketSize).map((seed) => {
        const player = players[seed - 1];
        return player ? player.id : null;
    });

    const winnersRounds = [];
    for (let roundIndex = 0; roundIndex < winnersRoundCount; roundIndex += 1) {
        const title = roundIndex === winnersRoundCount - 1
            ? "Winners Final"
            : `Winners Round ${roundIndex + 1}`;
        const round = createRound(title);
        const matchesInRound = bracketSize / (2 ** (roundIndex + 1));
        for (let i = 0; i < matchesInRound; i += 1) {
            round.push(createMatch(
                roundIndex,
                i,
                roundIndex === 0 ? firstSlots[i * 2] : undefined,
                roundIndex === 0 ? firstSlots[i * 2 + 1] : undefined
            ));
        }
        winnersRounds.push(round);
    }

    for (let roundIndex = 0; roundIndex < winnersRounds.length - 1; roundIndex += 1) {
        winnersRounds[roundIndex].forEach((match, i) => {
            assignWinner(match, winnersRounds[roundIndex + 1][Math.floor(i / 2)], i % 2 === 0 ? "p1Id" : "p2Id");
        });
    }

    const rounds = [];

    if (winnersRoundCount === 1) {
        const grandFinalRound = createRound("Grand Final");
        const grandFinal = createMatch(0, 0, undefined, undefined, "grand-final");
        grandFinalRound.push(grandFinal);

        const resetRound = createRound("Grand Final Reset");
        const resetMatch = createMatch(0, 0, undefined, undefined, "reset-final");
        resetRound.push(resetMatch);

        assignWinner(winnersRounds[0][0], grandFinal, "p1Id");
        assignLoser(winnersRounds[0][0], grandFinal, "p2Id");

        rounds.push(winnersRounds[0], grandFinalRound, resetRound);
        state.double.resetMatchId = resetMatch.id;
    } else {
        const losersMinorRounds = [];
        const losersMajorRounds = [];

        for (let block = 1; block < winnersRoundCount; block += 1) {
            const matchesInLosersRound = bracketSize / (2 ** (block + 1));
            const minorRound = createRound(`Losers Round ${block * 2 - 1}`);
            const majorRound = createRound(`Losers Round ${block * 2}`);

            for (let i = 0; i < matchesInLosersRound; i += 1) {
                minorRound.push(createMatch(0, i));
                majorRound.push(createMatch(0, i));
            }

            losersMinorRounds.push(minorRound);
            losersMajorRounds.push(majorRound);
        }

        winnersRounds[0].forEach((match, i) => {
            const target = losersMinorRounds[0][Math.floor(i / 2)];
            assignLoser(match, target, i % 2 === 0 ? "p1Id" : "p2Id");
        });

        for (let block = 1; block < winnersRoundCount; block += 1) {
            const minorRound = losersMinorRounds[block - 1];
            const majorRound = losersMajorRounds[block - 1];

            minorRound.forEach((match, i) => {
                assignWinner(match, majorRound[i], "p1Id");
            });

            winnersRounds[block].forEach((match, i) => {
                assignLoser(match, majorRound[i], "p2Id");
            });

            if (block < winnersRoundCount - 1) {
                const nextMinor = losersMinorRounds[block];
                majorRound.forEach((match, i) => {
                    assignWinner(match, nextMinor[Math.floor(i / 2)], i % 2 === 0 ? "p1Id" : "p2Id");
                });
            }
        }

        const grandFinalRound = createRound("Grand Final");
        const grandFinal = createMatch(0, 0, undefined, undefined, "grand-final");
        grandFinalRound.push(grandFinal);

        const resetRound = createRound("Grand Final Reset");
        const resetMatch = createMatch(0, 0, undefined, undefined, "reset-final");
        resetRound.push(resetMatch);

        assignWinner(winnersRounds[winnersRounds.length - 1][0], grandFinal, "p1Id");
        assignWinner(losersMajorRounds[losersMajorRounds.length - 1][0], grandFinal, "p2Id");

        rounds.push(winnersRounds[0]);
        for (let block = 1; block < winnersRoundCount; block += 1) {
            rounds.push(losersMinorRounds[block - 1]);
            rounds.push(winnersRounds[block]);
            rounds.push(losersMajorRounds[block - 1]);
        }
        rounds.push(grandFinalRound, resetRound);
        state.double.resetMatchId = resetMatch.id;
    }

    rounds.forEach((round, roundIndex) => {
        round.forEach((match, indexInRound) => {
            match.roundIndex = roundIndex;
            match.indexInRound = indexInRound;
        });
    });

    winnersRounds[0].forEach((match) => resolveAutoAdvance(match, rounds));
    return rounds;
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
        propagateLoser(match, rounds);
        return;
    }

    if (isRealPlayerId(match.p2Id) && match.p1Id === null) {
        match.completed = true;
        match.winnerId = match.p2Id;
        match.loserId = match.p1Id;
        propagateWinner(match, rounds);
        propagateLoser(match, rounds);
    }
}

function propagateWinner(match, rounds) {
    if (!match.nextMatchId || !match.nextSlot) return;
    const next = findMatchById(rounds, match.nextMatchId);
    if (!next) return;

    next[match.nextSlot] = match.winnerId;
    resolveAutoAdvance(next, rounds);
}

function propagateLoser(match, rounds) {
    if (!match.loserNextMatchId || !match.loserNextSlot) return;
    const next = findMatchById(rounds, match.loserNextMatchId);
    if (!next) return;

    next[match.loserNextSlot] = match.loserId;
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
                <label>${escapeHtml(getPlayerName(match.p1Id))}</label>
                <input type="number" min="0" step="1" id="score-a" />
            </div>
            <div class="score-grid">
                <label>${escapeHtml(getPlayerName(match.p2Id))}</label>
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

        if (a === b) {
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

    if (isRealPlayerId(match.loserId)) {
        state.double.losses[match.loserId] = (state.double.losses[match.loserId] || 0) + 1;
    }

    if (match.bracketRole === "grand-final") {
        const p1Losses = isRealPlayerId(match.p1Id) ? (state.double.losses[match.p1Id] || 0) : 0;
        const p2Losses = isRealPlayerId(match.p2Id) ? (state.double.losses[match.p2Id] || 0) : 0;
        const needsReset = p1Losses === 1 && p2Losses === 1;

        if (needsReset && state.double.resetMatchId) {
            const resetMatch = findMatch(state.double.resetMatchId);
            if (resetMatch) {
                resetMatch.p1Id = match.winnerId;
                resetMatch.p2Id = match.loserId;
                resetMatch.score1 = null;
                resetMatch.score2 = null;
                resetMatch.winnerId = null;
                resetMatch.loserId = null;
                resetMatch.completed = false;
            }
        }
    } else if (match.bracketRole !== "reset-final") {
        propagateWinner(match, state.rounds);
        propagateLoser(match, state.rounds);
    }
}

function getRoundMeta(round) {
    const countLabel = `${round.length} match${round.length === 1 ? "" : "es"}`;
    if (round.title === "Grand Final Reset") {
        return "If needed";
    }
    return countLabel;
}

function createMatchCard(match, extraClass = "") {
    const card = document.createElement("div");
    card.className = `match ${match.completed ? "completed" : ""} ${extraClass}`.trim();

    const p1Name = getPlayerName(match.p1Id);
    const p2Name = getPlayerName(match.p2Id);
    const p1Winner = match.completed && match.winnerId === match.p1Id;
    const p2Winner = match.completed && match.winnerId === match.p2Id;
    const clickable = !match.completed && isRealPlayerId(match.p1Id) && isRealPlayerId(match.p2Id);

    if (clickable) {
        card.classList.add("clickable");
        card.addEventListener("click", () => openScoreModal(match.id));
    }

    card.innerHTML = `
        <div class="player-row ${p1Winner ? "winner" : ""} ${match.p1Id === null ? "bye" : ""}">
            <span>${escapeHtml(p1Name)}</span>
            <strong>${match.score1 !== null ? match.score1 : ""}</strong>
        </div>
        <div class="player-row ${p2Winner ? "winner" : ""} ${match.p2Id === null ? "bye" : ""}">
            <span>${escapeHtml(p2Name)}</span>
            <strong>${match.score2 !== null ? match.score2 : ""}</strong>
        </div>
        <div class="match-meta">${clickable ? "Click to enter score" : match.completed ? "Completed" : "Waiting"}</div>
    `;

    return card;
}

function drawConnector(svg, x1, y1, x2, y2, className) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const horizontalSpan = Math.max(48, x2 - x1);
    const isLoserPath = className.includes("loser-path");
    const elbowRatio = isLoserPath ? 0.28 : 0.72;
    const elbowX = Math.min(x2 - 24, x1 + horizontalSpan * elbowRatio);
    path.setAttribute("d", `M ${x1} ${y1} H ${elbowX} V ${y2} H ${x2}`);
    path.setAttribute("class", className);
    svg.appendChild(path);
}

function renderDoubleBracket(container) {
    if (state.rounds.length === 0) return;

    const matchWidth = 216;
    const matchHeight = 92;
    const roundGap = 56;
    const laneGap = 48;
    const pad = 20;
    const laneTitleHeight = 28;
    const roundBadgeHeight = 22;
    const laneHeaderGap = 6;
    const roundContentOffset = roundBadgeHeight + 6;
    const winnersUnit = 52;
    const losersRowGap = 116;

    const winnersRounds = state.rounds.filter((round) => round.title?.startsWith("Winners"));
    const losersRounds = state.rounds.filter((round) => round.title?.startsWith("Losers"));
    const finalsRounds = state.rounds.filter((round) => {
        if (!round.title?.startsWith("Grand")) return false;
        if (round.title !== "Grand Final Reset") return true;
        return round.some((match) => match.p1Id !== undefined || match.p2Id !== undefined || match.completed);
    });

    const calcLaneHeight = (rounds, getTop) => {
        let height = laneTitleHeight + laneHeaderGap + roundContentOffset + matchHeight;
        rounds.forEach((round, roundIndex) => {
            round.forEach((match, matchIndex) => {
                height = Math.max(height, laneTitleHeight + laneHeaderGap + getTop(roundIndex, matchIndex) + matchHeight + 24);
            });
        });
        return height;
    };

    const winnersTop = (roundIndex, matchIndex) => roundContentOffset + (2 ** roundIndex) * (matchIndex * 2 + 1) * winnersUnit;
    const losersTop = (roundIndex, matchIndex) => roundContentOffset + matchIndex * losersRowGap + roundIndex * 14;

    const winnersHeight = calcLaneHeight(winnersRounds, winnersTop);
    const losersHeight = calcLaneHeight(losersRounds, losersTop);
    const laneWidth = (rounds) => Math.max(1, rounds.length) * matchWidth + Math.max(0, rounds.length - 1) * roundGap;
    const winnersWidth = laneWidth(winnersRounds);
    const losersWidth = laneWidth(losersRounds);
    const finalsWidth = Math.max(1, finalsRounds.length) * matchWidth + Math.max(0, finalsRounds.length - 1) * roundGap;
    const finalsHeight = Math.max(
        208,
        laneTitleHeight + laneHeaderGap + roundContentOffset + (finalsRounds.length * (matchHeight + 20))
    );
    const contentWidth = pad * 2 + Math.max(winnersWidth, losersWidth) + laneGap + finalsWidth;
    const contentHeight = Math.max(
        pad * 2 + winnersHeight + laneGap + losersHeight,
        pad * 2 + finalsHeight + 12
    );

    const stage = document.createElement("div");
    stage.className = "double-bracket";
    stage.style.width = `${contentWidth}px`;
    stage.style.height = `${contentHeight}px`;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("double-lines");
    svg.setAttribute("viewBox", `0 0 ${contentWidth} ${contentHeight}`);
    stage.appendChild(svg);

    const matchElements = new Map();

    const renderLane = (title, rounds, className, x, y, getTop, metaOffset = 0) => {
        const lane = document.createElement("section");
        lane.className = `double-lane ${className}`;
        lane.style.left = `${x}px`;
        lane.style.top = `${y}px`;
        lane.style.width = `${laneWidth(rounds)}px`;
        lane.style.height = `${calcLaneHeight(rounds, getTop)}px`;

        const laneTitle = document.createElement("div");
        laneTitle.className = "double-lane-title";
        laneTitle.textContent = title;
        lane.appendChild(laneTitle);

        rounds.forEach((round, roundIndex) => {
            const roundEl = document.createElement("div");
            roundEl.className = "double-round";
            roundEl.style.left = `${roundIndex * (matchWidth + roundGap)}px`;
            roundEl.style.top = `${laneTitleHeight + laneHeaderGap}px`;
            roundEl.style.width = `${matchWidth}px`;
            roundEl.style.height = `${Math.max(120, calcLaneHeight(rounds, getTop) - (laneTitleHeight + laneHeaderGap))}px`;

            const badge = document.createElement("div");
            badge.className = "round-badge";
            badge.textContent = round.title;
            roundEl.appendChild(badge);

            round.forEach((match, matchIndex) => {
                const roleClass = match.bracketRole
                    ? `match-${match.bracketRole}`
                    : className === "winners"
                        ? "match-winners"
                        : "match-losers";
                const card = createMatchCard(match, roleClass);
                card.style.position = "absolute";
                card.style.left = "0";
                card.style.top = `${getTop(roundIndex, matchIndex) + metaOffset}px`;
                roundEl.appendChild(card);
                matchElements.set(match.id, card);
            });

            lane.appendChild(roundEl);
        });

        stage.appendChild(lane);
    };

    renderLane("Winners Bracket", winnersRounds, "winners", pad, pad, winnersTop);
    renderLane("Losers Bracket", losersRounds, "losers", pad, pad + winnersHeight + laneGap, losersTop);

    const finalsLane = document.createElement("section");
    finalsLane.className = "double-lane finals";
    finalsLane.style.left = `${pad + Math.max(winnersWidth, losersWidth) + laneGap}px`;
    finalsLane.style.top = `${pad + Math.max(24, Math.round((contentHeight - pad * 2 - finalsHeight) / 2))}px`;
    finalsLane.style.width = `${finalsWidth}px`;
    finalsLane.style.height = `${finalsHeight}px`;

    const finalsTitle = document.createElement("div");
    finalsTitle.className = "double-lane-title";
    finalsTitle.textContent = "Finals";
    finalsLane.appendChild(finalsTitle);

    finalsRounds.forEach((round, roundIndex) => {
        const roundEl = document.createElement("div");
        roundEl.className = "double-round";
        roundEl.style.left = `${roundIndex * (matchWidth + roundGap)}px`;
        roundEl.style.top = `${laneTitleHeight + laneHeaderGap}px`;
        roundEl.style.width = `${matchWidth}px`;
        roundEl.style.height = `${finalsHeight - (laneTitleHeight + laneHeaderGap)}px`;

        const badge = document.createElement("div");
        badge.className = "round-badge";
        badge.textContent = round.title;
        roundEl.appendChild(badge);

        round.forEach((match, matchIndex) => {
            const card = createMatchCard(match, match.bracketRole === "reset-final" ? "match-reset" : "match-grand-final");
            card.style.position = "absolute";
            card.style.left = "0";
            card.style.top = `${roundContentOffset + matchIndex * (matchHeight + 22)}px`;
            roundEl.appendChild(card);
            matchElements.set(match.id, card);
        });

        finalsLane.appendChild(roundEl);
    });

    stage.appendChild(finalsLane);
    container.appendChild(stage);

    const stageRect = stage.getBoundingClientRect();
    state.rounds.flat().forEach((match) => {
        const sourceEl = matchElements.get(match.id);
        if (!sourceEl) return;
        const sourceRect = sourceEl.getBoundingClientRect();
        const x1 = sourceRect.right - stageRect.left;
        const y1 = sourceRect.top - stageRect.top + sourceRect.height / 2;

        if (match.nextMatchId) {
            const targetEl = matchElements.get(match.nextMatchId);
            if (targetEl) {
                const targetRect = targetEl.getBoundingClientRect();
                drawConnector(
                    svg,
                    x1,
                    y1,
                    targetRect.left - stageRect.left,
                    targetRect.top - stageRect.top + targetRect.height / 2,
                    "double-path winner-path"
                );
            }
        }

        if (match.loserNextMatchId) {
            const targetEl = matchElements.get(match.loserNextMatchId);
            if (targetEl) {
                const targetRect = targetEl.getBoundingClientRect();
                drawConnector(
                    svg,
                    x1,
                    y1,
                    targetRect.left - stageRect.left,
                    targetRect.top - stageRect.top + targetRect.height / 2,
                    "double-path loser-path"
                );
            }
        }
    });
}

function render() {
    ui.note.textContent = state.note;
    ui.bracketDisplay.innerHTML = "";
    ui.title.textContent = "Double Elimination";

    // Clear and prepare bracket display
    ui.bracketDisplay.innerHTML = '';
    const bracketContainer = document.createElement('div');
    bracketContainer.className = 'bracket-container';
    bracketContainer.dataset.type = "double";
    ui.bracketDisplay.appendChild(bracketContainer);

    renderDoubleBracket(bracketContainer);

    const alive = state.players.filter((player) => (state.double.losses[player.id] || 0) < 2);
    if (alive.length === 1) {
        ui.note.textContent = `Champion: ${alive[0].name}`;
    }
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
            state = normalizeImportedState(payload);
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
    state = createEmptyState();

    ui.setupSection.classList.remove("hidden");
    ui.bracketSection.classList.add("hidden");
    generatePlayerFields();
}
