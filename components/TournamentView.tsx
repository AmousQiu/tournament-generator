"use client";

import { completeMatch, undoMatch } from "@/lib/bracket-engine";
import type { BracketKind, ScoreInput, Tournament } from "@/lib/types";
import { MatchCard } from "./MatchCard";

type TournamentViewProps = {
  tournament: Tournament;
  setTournament: (tournament: Tournament) => void;
  onReset: () => void;
};

const sections: { bracket: BracketKind; title: string }[] = [
  { bracket: "winners", title: "Winners Bracket" },
  { bracket: "losers", title: "Losers Bracket" },
  { bracket: "grand_final", title: "Grand Final" },
  { bracket: "grand_final_reset", title: "Reset Final" }
];

export function TournamentView({ tournament, setTournament, onReset }: TournamentViewProps) {
  const champion = tournament.players.find((player) => player.id === tournament.championId);

  function submit(matchId: string, input: ScoreInput): string | null {
    try {
      setTournament(completeMatch(tournament, matchId, input));
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Unable to submit result.";
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Tournament</p>
          <h1 className="mt-2 text-3xl font-bold text-stone-950 sm:text-4xl">Double Elimination</h1>
          {champion ? <p className="mt-2 text-lg font-semibold text-emerald-800">Champion: {champion.name}</p> : null}
        </div>
        <button
          type="button"
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
          onClick={onReset}
        >
          Reset tournament
        </button>
      </header>

      <div className="space-y-8">
        {sections.map((section) => {
          const matches = tournament.matches
            .filter((match) => match.bracket === section.bracket)
            .sort((left, right) => left.round - right.round || left.order - right.order);

          return (
            <section key={section.bracket}>
              <h2 className="mb-3 text-xl font-bold text-stone-950">{section.title}</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    players={tournament.players}
                    onSubmit={submit}
                    onUndo={(matchId) => setTournament(undoMatch(tournament, matchId))}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
