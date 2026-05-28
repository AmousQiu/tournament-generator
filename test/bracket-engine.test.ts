import { describe, expect, it } from "vitest";
import { completeMatch, createTournament, getMatchStatus, undoMatch } from "@/lib/bracket-engine";
import { getTemplate } from "@/lib/templates";
import type { Match, Tournament } from "@/lib/types";
import { validatePlayerNames } from "@/lib/validation";

const names4 = ["Ada", "Ben", "Cal", "Dee"];
const names5 = ["Ada", "Ben", "Cal", "Dee", "Eli"];
const names6 = ["Ada", "Ben", "Cal", "Dee", "Eli", "Fay"];

describe("validation", () => {
  it("requires 4 to 6 unique trimmed names", () => {
    expect(validatePlayerNames(["Ada", " Ben ", "Cal", "Dee"])).toEqual({
      ok: true,
      names: ["Ada", "Ben", "Cal", "Dee"]
    });

    const duplicate = validatePlayerNames(["Ada", "ada", "Cal", "Dee"]);
    expect(duplicate.ok).toBe(false);

    const tooFew = validatePlayerNames(["Ada", "Ben", "Cal"]);
    expect(tooFew.ok).toBe(false);
  });

  it("selects only hardcoded 4, 5, and 6 player templates", () => {
    expect(getTemplate(4).matches.map((match) => match.id)).toContain("GF_RESET");
    expect(getTemplate(5).matches.map((match) => match.id)).toContain("L4");
    expect(getTemplate(6).matches.map((match) => match.id)).toContain("W7");
    expect(() => getTemplate(7)).toThrow("Player count must be 4, 5, or 6.");
  });
});

describe("progression", () => {
  it("advances winners and losers through the 4-player bracket", () => {
    let tournament = createTournament(names4, noShuffle);
    tournament = win(tournament, "W1", "A");
    tournament = win(tournament, "W2", "A");

    expect(match(tournament, "W3").slotA.playerId).toBe("P1");
    expect(match(tournament, "W3").slotB.playerId).toBe("P2");
    expect(match(tournament, "L1").slotA.playerId).toBe("P4");
    expect(match(tournament, "L1").slotB.playerId).toBe("P3");

    tournament = win(tournament, "W3", "A");
    tournament = win(tournament, "L1", "A");
    tournament = win(tournament, "L2", "A");

    expect(match(tournament, "GF").slotA.playerId).toBe("P1");
    expect(match(tournament, "GF").slotB.playerId).toBe("P4");
    expect(getMatchStatus(match(tournament, "GF"))).toBe("playable");
  });

  it("auto-resolves byes in the 5-player template", () => {
    const tournament = createTournament(names5, noShuffle);

    expect(match(tournament, "W2").result?.isBye).toBe(true);
    expect(match(tournament, "W4").slotB.playerId).toBe("P3");
    expect(getMatchStatus(match(tournament, "W2"))).toBe("completed");
  });

  it("auto-resolves byes in the 6-player template", () => {
    const tournament = createTournament(names6, noShuffle);

    expect(match(tournament, "W3").result?.winnerId).toBe("P1");
    expect(match(tournament, "W4").result?.winnerId).toBe("P2");
    expect(match(tournament, "W5").slotA.playerId).toBe("P1");
    expect(match(tournament, "W6").slotA.playerId).toBe("P2");
  });

  it("requires integer scores and the clicked winner to have the higher score", () => {
    const tournament = createTournament(names4, noShuffle);

    expect(() =>
      completeMatch(tournament, "W1", {
        scoreA: "2.5",
        scoreB: "1",
        winnerId: "P1"
      })
    ).toThrow("Scores must be integers.");

    expect(() =>
      completeMatch(tournament, "W1", {
        scoreA: "1",
        scoreB: "2",
        winnerId: "P1"
      })
    ).toThrow("Selected winner must have the higher score.");
  });

  it("enables grand final reset when the losers finalist wins the first grand final", () => {
    let tournament = completedFourPlayerFinal();
    tournament = win(tournament, "GF", "B");

    expect(tournament.status).toBe("in_progress");
    expect(tournament.championId).toBeNull();
    expect(match(tournament, "GF_RESET").slotA.playerId).toBe("P1");
    expect(match(tournament, "GF_RESET").slotB.playerId).toBe("P4");
    expect(getMatchStatus(match(tournament, "GF_RESET"))).toBe("playable");

    tournament = win(tournament, "GF_RESET", "A");
    expect(tournament.status).toBe("complete");
    expect(tournament.championId).toBe("P1");
  });

  it("declares champion after first grand final if winners finalist wins", () => {
    const tournament = win(completedFourPlayerFinal(), "GF", "A");

    expect(tournament.status).toBe("complete");
    expect(tournament.championId).toBe("P1");
    expect(getMatchStatus(match(tournament, "GF_RESET"))).toBe("pending");
  });

  it("undo clears downstream dependent results and slots", () => {
    let tournament = completedFourPlayerFinal();
    tournament = win(tournament, "GF", "B");
    tournament = win(tournament, "GF_RESET", "A");

    const undone = undoMatch(tournament, "W1");

    expect(match(undone, "W1").result).toBeNull();
    expect(match(undone, "W3").result).toBeNull();
    expect(match(undone, "L1").result).toBeNull();
    expect(match(undone, "L2").result).toBeNull();
    expect(match(undone, "GF").result).toBeNull();
    expect(match(undone, "GF_RESET").result).toBeNull();
    expect(match(undone, "W3").slotA.playerId).toBeNull();
    expect(match(undone, "L1").slotA.playerId).toBeNull();
    expect(undone.status).toBe("in_progress");
    expect(undone.championId).toBeNull();
  });
});

function completedFourPlayerFinal(): Tournament {
  let tournament = createTournament(names4, noShuffle);
  tournament = win(tournament, "W1", "A");
  tournament = win(tournament, "W2", "A");
  tournament = win(tournament, "W3", "A");
  tournament = win(tournament, "L1", "A");
  tournament = win(tournament, "L2", "A");
  return tournament;
}

function win(tournament: Tournament, matchId: string, slot: "A" | "B"): Tournament {
  const current = match(tournament, matchId);
  const winnerId = slot === "A" ? current.slotA.playerId : current.slotB.playerId;
  if (!winnerId) throw new Error(`No player in ${matchId}.${slot}`);

  return completeMatch(tournament, matchId, {
    scoreA: slot === "A" ? "2" : "0",
    scoreB: slot === "B" ? "2" : "0",
    winnerId
  });
}

function match(tournament: Tournament, matchId: string): Match {
  const found = tournament.matches.find((candidate) => candidate.id === matchId);
  if (!found) throw new Error(`Missing ${matchId}`);
  return found;
}

function noShuffle() {
  return 0.999;
}
