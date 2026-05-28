export type BracketKind = "winners" | "losers" | "grand_final" | "grand_final_reset";
export type MatchStatus = "pending" | "playable" | "completed";
export type TournamentStatus = "setup" | "in_progress" | "complete";
export type SlotKey = "A" | "B";
export type SourceOutcome = "winner" | "loser";

export type Player = {
  id: string;
  name: string;
};

export type MatchSlot = {
  playerId: string | null;
  sourceMatchId?: string;
  sourceOutcome?: SourceOutcome;
  isBye?: boolean;
};

export type MatchResult = {
  winnerId: string;
  loserId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  isBye?: boolean;
};

export type Match = {
  id: string;
  bracket: BracketKind;
  round: number;
  order: number;
  slotA: MatchSlot;
  slotB: MatchSlot;
  result: MatchResult | null;
  dependsOn: string[];
  nextWinnerMatchId?: string;
  nextWinnerSlot?: SlotKey;
  nextLoserMatchId?: string;
  nextLoserSlot?: SlotKey;
};

export type Tournament = {
  id: string;
  players: Player[];
  matches: Match[];
  championId: string | null;
  status: TournamentStatus;
};

export type SeedRef =
  | { type: "player"; seed: number }
  | { type: "winner"; matchId: string }
  | { type: "loser"; matchId: string }
  | { type: "bye" };

export type TemplateMatch = {
  id: string;
  bracket: BracketKind;
  round: number;
  order: number;
  slotA: SeedRef;
  slotB: SeedRef;
  nextWinner?: { matchId: string; slot: SlotKey };
  nextLoser?: { matchId: string; slot: SlotKey };
};

export type Template = {
  playerCount: 4 | 5 | 6;
  matches: TemplateMatch[];
};

export type ScoreInput = {
  scoreA: string;
  scoreB: string;
  winnerId: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };
