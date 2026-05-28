"use client";

import { useState } from "react";
import { validatePlayerNames } from "@/lib/validation";

type SetupFormProps = {
  onGenerate: (names: string[]) => void;
};

export function SetupForm({ onGenerate }: SetupFormProps) {
  const [names, setNames] = useState(["", "", "", ""]);
  const [errors, setErrors] = useState<string[]>([]);

  function updateName(index: number, value: string) {
    setNames((current) => current.map((name, nameIndex) => (nameIndex === index ? value : name)));
  }

  function generate() {
    const validation = validatePlayerNames(names);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    onGenerate(validation.names);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Double elimination</p>
        <h1 className="mt-3 text-4xl font-bold text-stone-950 sm:text-5xl">Tournament Generator</h1>
      </div>

      <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          {names.map((name, index) => (
            <label key={index} className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Player {index + 1}</span>
              <input
                className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                value={name}
                onChange={(event) => updateName(index, event.target.value)}
                placeholder="Name"
              />
            </label>
          ))}
        </div>

        {errors.length > 0 ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={names.length >= 6}
            onClick={() => setNames((current) => [...current, ""])}
          >
            Add player
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={names.length <= 4}
            onClick={() => setNames((current) => current.slice(0, -1))}
          >
            Remove player
          </button>
          <button
            type="button"
            className="ml-auto rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            onClick={generate}
          >
            Generate Tournament
          </button>
        </div>
      </section>
    </main>
  );
}
