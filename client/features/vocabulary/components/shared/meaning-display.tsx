"use client";

import { Meaning } from "../../types";

interface MeaningDisplayProps {
  meanings: Meaning[];
}

export function MeaningDisplay({ meanings }: MeaningDisplayProps) {
  if (!meanings || meanings.length === 0) return null;

  return (
    <div className="space-y-6 w-full text-left">
      {meanings.map((meaning, mIdx) => (
        <div key={mIdx} className="space-y-2">
          {/* Part of Speech: Noun, Verb, etc. */}
          <div className="flex items-center gap-2">
            <span className="italic text-primary font-semibold text-sm">{meaning.partOfSpeech}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <ul className="space-y-4">
            {meaning.definitions.map((def, dIdx) => (
              <li key={dIdx} className="space-y-1">
                <p className="text-lg leading-7">
                  <span className="text-muted-foreground mr-2">{dIdx + 1}.</span>
                  {def.definition}
                </p>

                {/* Example sentence */}
                {def.example && (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded border-l-2 border-primary/30 ml-6">
                    {def.example}
                  </p>
                )}

                {/* Synonyms & Antonyms */}
                {(def.synonyms?.length > 0 || def.antonyms?.length > 0) && (
                  <div className="ml-6 flex flex-wrap gap-4 text-xs mt-2">
                    {def.synonyms?.length > 0 && (
                      <p>
                        <span className="font-bold text-green-600">Synonyms: </span>
                        {def.synonyms.join(", ")}
                      </p>
                    )}
                    {def.antonyms?.length > 0 && (
                      <p>
                        <span className="font-bold text-red-600">Antonyms: </span>
                        {def.antonyms.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
