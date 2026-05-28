import type { Template } from "./types";

export const template4: Template = {
  playerCount: 4,
  matches: [
    {
      id: "W1",
      bracket: "winners",
      round: 1,
      order: 1,
      slotA: { type: "player", seed: 1 },
      slotB: { type: "player", seed: 4 },
      nextWinner: { matchId: "W3", slot: "A" },
      nextLoser: { matchId: "L1", slot: "A" }
    },
    {
      id: "W2",
      bracket: "winners",
      round: 1,
      order: 2,
      slotA: { type: "player", seed: 2 },
      slotB: { type: "player", seed: 3 },
      nextWinner: { matchId: "W3", slot: "B" },
      nextLoser: { matchId: "L1", slot: "B" }
    },
    {
      id: "W3",
      bracket: "winners",
      round: 2,
      order: 1,
      slotA: { type: "winner", matchId: "W1" },
      slotB: { type: "winner", matchId: "W2" },
      nextWinner: { matchId: "GF", slot: "A" },
      nextLoser: { matchId: "L2", slot: "B" }
    },
    {
      id: "L1",
      bracket: "losers",
      round: 1,
      order: 1,
      slotA: { type: "loser", matchId: "W1" },
      slotB: { type: "loser", matchId: "W2" },
      nextWinner: { matchId: "L2", slot: "A" }
    },
    {
      id: "L2",
      bracket: "losers",
      round: 2,
      order: 1,
      slotA: { type: "winner", matchId: "L1" },
      slotB: { type: "loser", matchId: "W3" },
      nextWinner: { matchId: "GF", slot: "B" }
    },
    {
      id: "GF",
      bracket: "grand_final",
      round: 1,
      order: 1,
      slotA: { type: "winner", matchId: "W3" },
      slotB: { type: "winner", matchId: "L2" }
    },
    {
      id: "GF_RESET",
      bracket: "grand_final_reset",
      round: 2,
      order: 1,
      slotA: { type: "winner", matchId: "GF" },
      slotB: { type: "loser", matchId: "GF" }
    }
  ]
};

export const template5: Template = {
  playerCount: 5,
  matches: [
    {
      id: "W1",
      bracket: "winners",
      round: 1,
      order: 1,
      slotA: { type: "player", seed: 4 },
      slotB: { type: "player", seed: 5 },
      nextWinner: { matchId: "W3", slot: "B" },
      nextLoser: { matchId: "L1", slot: "A" }
    },
    {
      id: "W2",
      bracket: "winners",
      round: 1,
      order: 2,
      slotA: { type: "player", seed: 3 },
      slotB: { type: "bye" },
      nextWinner: { matchId: "W4", slot: "B" }
    },
    {
      id: "W3",
      bracket: "winners",
      round: 2,
      order: 1,
      slotA: { type: "player", seed: 1 },
      slotB: { type: "winner", matchId: "W1" },
      nextWinner: { matchId: "W5", slot: "A" },
      nextLoser: { matchId: "L2", slot: "A" }
    },
    {
      id: "W4",
      bracket: "winners",
      round: 2,
      order: 2,
      slotA: { type: "player", seed: 2 },
      slotB: { type: "winner", matchId: "W2" },
      nextWinner: { matchId: "W5", slot: "B" },
      nextLoser: { matchId: "L2", slot: "B" }
    },
    {
      id: "W5",
      bracket: "winners",
      round: 3,
      order: 1,
      slotA: { type: "winner", matchId: "W3" },
      slotB: { type: "winner", matchId: "W4" },
      nextWinner: { matchId: "GF", slot: "A" },
      nextLoser: { matchId: "L4", slot: "B" }
    },
    {
      id: "L1",
      bracket: "losers",
      round: 1,
      order: 1,
      slotA: { type: "loser", matchId: "W1" },
      slotB: { type: "bye" },
      nextWinner: { matchId: "L3", slot: "A" }
    },
    {
      id: "L2",
      bracket: "losers",
      round: 2,
      order: 1,
      slotA: { type: "loser", matchId: "W3" },
      slotB: { type: "loser", matchId: "W4" },
      nextWinner: { matchId: "L3", slot: "B" }
    },
    {
      id: "L3",
      bracket: "losers",
      round: 3,
      order: 1,
      slotA: { type: "winner", matchId: "L1" },
      slotB: { type: "winner", matchId: "L2" },
      nextWinner: { matchId: "L4", slot: "A" }
    },
    {
      id: "L4",
      bracket: "losers",
      round: 4,
      order: 1,
      slotA: { type: "winner", matchId: "L3" },
      slotB: { type: "loser", matchId: "W5" },
      nextWinner: { matchId: "GF", slot: "B" }
    },
    {
      id: "GF",
      bracket: "grand_final",
      round: 1,
      order: 1,
      slotA: { type: "winner", matchId: "W5" },
      slotB: { type: "winner", matchId: "L4" }
    },
    {
      id: "GF_RESET",
      bracket: "grand_final_reset",
      round: 2,
      order: 1,
      slotA: { type: "winner", matchId: "GF" },
      slotB: { type: "loser", matchId: "GF" }
    }
  ]
};

export const template6: Template = {
  playerCount: 6,
  matches: [
    {
      id: "W1",
      bracket: "winners",
      round: 1,
      order: 1,
      slotA: { type: "player", seed: 3 },
      slotB: { type: "player", seed: 6 },
      nextWinner: { matchId: "W6", slot: "B" },
      nextLoser: { matchId: "L1", slot: "A" }
    },
    {
      id: "W2",
      bracket: "winners",
      round: 1,
      order: 2,
      slotA: { type: "player", seed: 4 },
      slotB: { type: "player", seed: 5 },
      nextWinner: { matchId: "W5", slot: "B" },
      nextLoser: { matchId: "L1", slot: "B" }
    },
    {
      id: "W3",
      bracket: "winners",
      round: 1,
      order: 3,
      slotA: { type: "player", seed: 1 },
      slotB: { type: "bye" },
      nextWinner: { matchId: "W5", slot: "A" }
    },
    {
      id: "W4",
      bracket: "winners",
      round: 1,
      order: 4,
      slotA: { type: "player", seed: 2 },
      slotB: { type: "bye" },
      nextWinner: { matchId: "W6", slot: "A" }
    },
    {
      id: "W5",
      bracket: "winners",
      round: 2,
      order: 1,
      slotA: { type: "winner", matchId: "W3" },
      slotB: { type: "winner", matchId: "W2" },
      nextWinner: { matchId: "W7", slot: "A" },
      nextLoser: { matchId: "L2", slot: "A" }
    },
    {
      id: "W6",
      bracket: "winners",
      round: 2,
      order: 2,
      slotA: { type: "winner", matchId: "W4" },
      slotB: { type: "winner", matchId: "W1" },
      nextWinner: { matchId: "W7", slot: "B" },
      nextLoser: { matchId: "L2", slot: "B" }
    },
    {
      id: "W7",
      bracket: "winners",
      round: 3,
      order: 1,
      slotA: { type: "winner", matchId: "W5" },
      slotB: { type: "winner", matchId: "W6" },
      nextWinner: { matchId: "GF", slot: "A" },
      nextLoser: { matchId: "L4", slot: "B" }
    },
    {
      id: "L1",
      bracket: "losers",
      round: 1,
      order: 1,
      slotA: { type: "loser", matchId: "W1" },
      slotB: { type: "loser", matchId: "W2" },
      nextWinner: { matchId: "L3", slot: "A" }
    },
    {
      id: "L2",
      bracket: "losers",
      round: 2,
      order: 1,
      slotA: { type: "loser", matchId: "W5" },
      slotB: { type: "loser", matchId: "W6" },
      nextWinner: { matchId: "L3", slot: "B" }
    },
    {
      id: "L3",
      bracket: "losers",
      round: 3,
      order: 1,
      slotA: { type: "winner", matchId: "L1" },
      slotB: { type: "winner", matchId: "L2" },
      nextWinner: { matchId: "L4", slot: "A" }
    },
    {
      id: "L4",
      bracket: "losers",
      round: 4,
      order: 1,
      slotA: { type: "winner", matchId: "L3" },
      slotB: { type: "loser", matchId: "W7" },
      nextWinner: { matchId: "GF", slot: "B" }
    },
    {
      id: "GF",
      bracket: "grand_final",
      round: 1,
      order: 1,
      slotA: { type: "winner", matchId: "W7" },
      slotB: { type: "winner", matchId: "L4" }
    },
    {
      id: "GF_RESET",
      bracket: "grand_final_reset",
      round: 2,
      order: 1,
      slotA: { type: "winner", matchId: "GF" },
      slotB: { type: "loser", matchId: "GF" }
    }
  ]
};

export function getTemplate(playerCount: number): Template {
  if (playerCount === 4) return template4;
  if (playerCount === 5) return template5;
  if (playerCount === 6) return template6;
  throw new Error("Player count must be 4, 5, or 6.");
}
