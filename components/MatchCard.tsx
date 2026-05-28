"use client";

import { useState } from "react";
import { getMatchStatus } from "@/lib/bracket-engine";
import type { Match, Player, ScoreInput } from "@/lib/types";

type MatchCardProps = {
  match: Match;
  players: Player[];
  onSubmit: (matchId: string, input: ScoreInput) => string | null;
  onUndo: (matchId: string) => void;
};

export function MatchCard({ match, players, onSubmit, onUndo }: MatchCardProps) {
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [error, setError] = useState("");
  const status = getMatchStatus(match);
  const playable = status === "playable";
  const playerA = getSlotLabel(match.slotA.playerId, players, match.slotA.isBye);
  const playerB = getSlotLabel(match.slotB.playerId, players, match.slotB.isBye);

  function submit() {
    const submitError = onSubmit(match.id, { scoreA, scoreB, winnerId });
    if (submitError) {
      setError(submitError);
      return;
    }
    setError("");
    setScoreA("");
    setScoreB("");
    setWinnerId("");
  }

  return (
    <article
      className={[
        "rounded-lg border bg-white p-3 shadow-sm",
        playable ? "border-emerald-300" : "border-stone-200",
        status === "pending" ? "opacity-70" : ""
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-stone-950">{match.id}</h3>
        <span className="rounded-sm bg-stone-100 px-2 py-1 text-xs font-medium capitalize text-stone-600">
          {match.result?.isBye ? "bye" : status.replace("_", " ")}
        </span>
      </div>

      <div className="space-y-2">
        <PlayerRow
          label={playerA}
          score={match.result ? formatResultScore(match.result.scoreA) : scoreA}
          disabled={!playable || Boolean(match.result)}
          selected={winnerId === match.slotA.playerId || match.result?.winnerId === match.slotA.playerId}
          onScoreChange={setScoreA}
          onWinnerClick={() => match.slotA.playerId && setWinnerId(match.slotA.playerId)}
        />
        <PlayerRow
          label={playerB}
          score={match.result ? formatResultScore(match.result.scoreB) : scoreB}
          disabled={!playable || Boolean(match.result)}
          selected={winnerId === match.slotB.playerId || match.result?.winnerId === match.slotB.playerId}
          onScoreChange={setScoreB}
          onWinnerClick={() => match.slotB.playerId && setWinnerId(match.slotB.playerId)}
        />
      </div>

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-3 flex gap-2">
        {match.result && !match.result.isBye ? (
          <button
            type="button"
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
            onClick={() => onUndo(match.id)}
          >
            Undo
          </button>
        ) : (
          <button
            type="button"
            className="rounded-md bg-stone-950 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!playable}
            onClick={submit}
          >
            Submit result
          </button>
        )}
      </div>
    </article>
  );
}

function PlayerRow({
  label,
  score,
  disabled,
  selected,
  onScoreChange,
  onWinnerClick
}: {
  label: string;
  score: string;
  disabled: boolean;
  selected: boolean;
  onScoreChange: (score: string) => void;
  onWinnerClick: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-2">
      <button
        type="button"
        className={[
          "min-h-10 rounded-md border px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed",
          selected ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-stone-300 text-stone-800 hover:bg-stone-100"
        ].join(" ")}
        disabled={disabled}
        onClick={onWinnerClick}
      >
        <span className="block truncate">{label}</span>
      </button>
      <input
        className="h-10 rounded-md border border-stone-300 px-2 text-center outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
        value={score}
        inputMode="numeric"
        disabled={disabled}
        onChange={(event) => onScoreChange(event.target.value)}
      />
    </div>
  );
}

function getSlotLabel(playerId: string | null, players: Player[], isBye?: boolean): string {
  if (isBye) return "Bye";
  if (!playerId) return "TBD";
  return players.find((player) => player.id === playerId)?.name ?? "Unknown";
}

function formatResultScore(score: number | null): string {
  return score === null ? "-" : String(score);
}
