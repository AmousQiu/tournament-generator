"use client";

import { useState } from "react";
import { SetupForm } from "@/components/SetupForm";
import { TournamentView } from "@/components/TournamentView";
import { createTournament } from "@/lib/bracket-engine";
import type { Tournament } from "@/lib/types";

export default function Home() {
  const [tournament, setTournament] = useState<Tournament | null>(null);

  if (!tournament) {
    return <SetupForm onGenerate={(names) => setTournament(createTournament(names))} />;
  }

  return <TournamentView tournament={tournament} setTournament={setTournament} onReset={() => setTournament(null)} />;
}
