import type { Match, ScoreInput, ValidationResult } from "./types";

export function validatePlayerNames(names: string[]): { ok: true; names: string[] } | { ok: false; errors: string[] } {
  const trimmed = names.map((name) => name.trim());
  const errors: string[] = [];

  if (trimmed.length < 4 || trimmed.length > 6) {
    errors.push("Enter 4 to 6 players.");
  }

  trimmed.forEach((name, index) => {
    if (!name) errors.push(`Player ${index + 1} is required.`);
  });

  const seen = new Set<string>();
  trimmed.forEach((name) => {
    const key = name.toLocaleLowerCase();
    if (name && seen.has(key)) {
      errors.push("Player names must be unique.");
    }
    seen.add(key);
  });

  return errors.length ? { ok: false, errors } : { ok: true, names: trimmed };
}

export function parseIntegerScore(value: string): number | null {
  if (!/^-?\d+$/.test(value.trim())) return null;
  return Number(value);
}

export function validateMatchResult(match: Match, input: ScoreInput): ValidationResult {
  if (match.result) return { ok: false, error: "Match is already completed." };
  if (!match.slotA.playerId || !match.slotB.playerId) {
    return { ok: false, error: "Match is not ready yet." };
  }

  const scoreA = parseIntegerScore(input.scoreA);
  const scoreB = parseIntegerScore(input.scoreB);

  if (scoreA === null || scoreB === null) {
    return { ok: false, error: "Scores must be integers." };
  }

  if (scoreA === scoreB) {
    return { ok: false, error: "Scores cannot tie." };
  }

  if (input.winnerId !== match.slotA.playerId && input.winnerId !== match.slotB.playerId) {
    return { ok: false, error: "Select one of the match players as winner." };
  }

  const higherScorePlayerId = scoreA > scoreB ? match.slotA.playerId : match.slotB.playerId;
  if (input.winnerId !== higherScorePlayerId) {
    return { ok: false, error: "Selected winner must have the higher score." };
  }

  return { ok: true };
}
