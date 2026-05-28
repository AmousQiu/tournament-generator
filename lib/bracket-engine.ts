import { getTemplate } from "./templates";
import type {
  Match,
  MatchResult,
  MatchSlot,
  Player,
  ScoreInput,
  SeedRef,
  SlotKey,
  Template,
  Tournament
} from "./types";
import { validateMatchResult, validatePlayerNames } from "./validation";

type RandomFn = () => number;

export function shufflePlayers<T>(players: T[], random: RandomFn = Math.random): T[] {
  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function createTournament(names: string[], random: RandomFn = Math.random): Tournament {
  const validation = validatePlayerNames(names);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const players = shufflePlayers(
    validation.names.map((name, index) => ({
      id: `P${index + 1}`,
      name
    })),
    random
  ).map((player, index) => ({
    ...player,
    id: `P${index + 1}`
  }));

  const template = getTemplate(players.length);
  const tournament: Tournament = {
    id: `tournament-${Date.now()}`,
    players,
    matches: instantiateTemplate(template, players),
    championId: null,
    status: "in_progress"
  };

  return autoResolveByes(tournament);
}

export function instantiateTemplate(template: Template, players: Player[]): Match[] {
  return template.matches.map((templateMatch) => {
    const slotA = instantiateSlot(templateMatch.slotA, players);
    const slotB = instantiateSlot(templateMatch.slotB, players);
    const dependsOn = [slotA.sourceMatchId, slotB.sourceMatchId].filter((id): id is string => Boolean(id));

    return {
      id: templateMatch.id,
      bracket: templateMatch.bracket,
      round: templateMatch.round,
      order: templateMatch.order,
      slotA,
      slotB,
      result: null,
      dependsOn,
      nextWinnerMatchId: templateMatch.nextWinner?.matchId,
      nextWinnerSlot: templateMatch.nextWinner?.slot,
      nextLoserMatchId: templateMatch.nextLoser?.matchId,
      nextLoserSlot: templateMatch.nextLoser?.slot
    };
  });
}

function instantiateSlot(ref: SeedRef, players: Player[]): MatchSlot {
  if (ref.type === "player") {
    return { playerId: players[ref.seed - 1]?.id ?? null };
  }
  if (ref.type === "bye") {
    return { playerId: null, isBye: true };
  }
  return {
    playerId: null,
    sourceMatchId: ref.matchId,
    sourceOutcome: ref.type
  };
}

export function getMatchStatus(match: Match): "pending" | "playable" | "completed" {
  if (match.result) return "completed";
  if (match.slotA.playerId && match.slotB.playerId) return "playable";
  return "pending";
}

export function completeMatch(tournament: Tournament, matchId: string, input: ScoreInput): Tournament {
  const match = findMatch(tournament.matches, matchId);
  const validation = validateMatchResult(match, input);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const scoreA = Number(input.scoreA);
  const scoreB = Number(input.scoreB);
  const loserId = input.winnerId === match.slotA.playerId ? match.slotB.playerId : match.slotA.playerId;

  return applyResult(tournament, matchId, {
    winnerId: input.winnerId,
    loserId,
    scoreA,
    scoreB
  });
}

export function undoMatch(tournament: Tournament, matchId: string): Tournament {
  const affected = collectDownstreamMatchIds(tournament.matches, matchId);
  const matches = tournament.matches.map((match) => {
    const shouldClearResult = affected.has(match.id);
    return {
      ...match,
      result: shouldClearResult ? null : match.result,
      slotA: shouldClearSlot(match.slotA, affected) ? clearSlot(match.slotA) : { ...match.slotA },
      slotB: shouldClearSlot(match.slotB, affected) ? clearSlot(match.slotB) : { ...match.slotB }
    };
  });

  return autoResolveByes({
    ...tournament,
    matches,
    championId: null,
    status: "in_progress"
  });
}

export function autoResolveByes(tournament: Tournament): Tournament {
  let current = cloneTournament(tournament);
  let changed = true;

  while (changed) {
    changed = false;
    for (const match of current.matches) {
      if (match.result) continue;
      const byeA = Boolean(match.slotA.isBye);
      const byeB = Boolean(match.slotB.isBye);
      const realA = match.slotA.playerId;
      const realB = match.slotB.playerId;

      if (byeA !== byeB && (realA || realB)) {
        current = applyResult(current, match.id, {
          winnerId: realA ?? realB ?? "",
          loserId: null,
          scoreA: null,
          scoreB: null,
          isBye: true
        });
        changed = true;
        break;
      }
    }
  }

  return current;
}

function applyResult(tournament: Tournament, matchId: string, result: MatchResult): Tournament {
  let matches = tournament.matches.map((match) => (match.id === matchId ? { ...match, result } : cloneMatch(match)));
  const match = findMatch(matches, matchId);
  let championId = tournament.championId;
  let status = tournament.status;

  if (match.bracket === "grand_final") {
    const winnersChampionId = match.slotA.playerId;
    if (result.winnerId === winnersChampionId) {
      championId = result.winnerId;
      status = "complete";
    } else {
      matches = setSlot(matches, "GF_RESET", "A", {
        playerId: match.slotA.playerId,
        sourceMatchId: "GF",
        sourceOutcome: "loser"
      });
      matches = setSlot(matches, "GF_RESET", "B", {
        playerId: match.slotB.playerId,
        sourceMatchId: "GF",
        sourceOutcome: "winner"
      });
    }
  } else if (match.bracket === "grand_final_reset") {
    championId = result.winnerId;
    status = "complete";
  } else {
    if (match.nextWinnerMatchId && match.nextWinnerSlot) {
      matches = setSlot(matches, match.nextWinnerMatchId, match.nextWinnerSlot, {
        playerId: result.winnerId,
        sourceMatchId: match.id,
        sourceOutcome: "winner"
      });
    }

    if (result.loserId && match.nextLoserMatchId && match.nextLoserSlot) {
      matches = setSlot(matches, match.nextLoserMatchId, match.nextLoserSlot, {
        playerId: result.loserId,
        sourceMatchId: match.id,
        sourceOutcome: "loser"
      });
    }
  }

  return {
    ...tournament,
    matches,
    championId,
    status
  };
}

function collectDownstreamMatchIds(matches: Match[], startMatchId: string): Set<string> {
  const affected = new Set<string>([startMatchId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const match of matches) {
      if (affected.has(match.id)) continue;
      const dependsOnAffected =
        affected.has(match.slotA.sourceMatchId ?? "") || affected.has(match.slotB.sourceMatchId ?? "");
      if (dependsOnAffected) {
        affected.add(match.id);
        changed = true;
      }
    }
  }

  return affected;
}

function shouldClearSlot(slot: MatchSlot, affected: Set<string>): boolean {
  return Boolean(slot.sourceMatchId && affected.has(slot.sourceMatchId));
}

function clearSlot(slot: MatchSlot): MatchSlot {
  return {
    ...slot,
    playerId: null
  };
}

function setSlot(matches: Match[], matchId: string, slot: SlotKey, value: MatchSlot): Match[] {
  return matches.map((match) => {
    if (match.id !== matchId) return match;
    return slot === "A" ? { ...match, slotA: value } : { ...match, slotB: value };
  });
}

function findMatch(matches: Match[], matchId: string): Match {
  const match = matches.find((candidate) => candidate.id === matchId);
  if (!match) {
    throw new Error(`Unknown match ${matchId}.`);
  }
  return match;
}

function cloneTournament(tournament: Tournament): Tournament {
  return {
    ...tournament,
    players: tournament.players.map((player) => ({ ...player })),
    matches: tournament.matches.map(cloneMatch)
  };
}

function cloneMatch(match: Match): Match {
  return {
    ...match,
    slotA: { ...match.slotA },
    slotB: { ...match.slotB },
    result: match.result ? { ...match.result } : null
  };
}
