"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { moveArtAction } from "@/app/actions";
import { Button, Select } from "./ui";

export type GridArt = { id: number; width: number; height: number; title: string | null };

/**
 * A gallery of thumbnails. Editors can select pieces and move them into a
 * collection, which is how a bulk import gets sorted.
 */
export function ArtGrid({ art, kidId, collections, canEdit, linkBase = "/art", imageBase = "/art-files" }: {
  art: GridArt[];
  kidId: number;
  collections?: { id: number; title: string }[];
  canEdit?: boolean;
  /** Where pieces link to and load from; share links use their own. */
  linkBase?: string;
  imageBase?: string;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [target, setTarget] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const movable = canEdit && collections !== undefined;

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function move() {
    startTransition(async () => {
      const result = await moveArtAction(kidId, selected, target === "unsorted" ? null : Number(target));
      if (result.error) return setError(result.error);
      setSelected([]);
      setSelecting(false);
      setTarget("");
    });
  }

  return (
    <div>
      {movable && art.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {selecting ? (
            <>
              <span className="text-sm text-muted">{selected.length} selected</span>
              <div className="w-56">
                <Select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Move to">
                  <option value="">Move to…</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                  <option value="unsorted">Unsorted</option>
                </Select>
              </div>
              <Button type="button" disabled={!selected.length || !target || pending} onClick={move}>
                {pending ? "Moving…" : "Move"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSelected(art.map((a) => a.id))}>Select all</Button>
              <Button type="button" variant="secondary" onClick={() => { setSelecting(false); setSelected([]); }}>Cancel</Button>
              {error && <span className="text-sm text-red-800">{error}</span>}
            </>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setSelecting(true)}>Select</Button>
          )}
        </div>
      )}
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {art.map((a) => {
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${imageBase}/${a.id}/thumb`}
              width={a.width}
              height={a.height}
              alt={a.title ?? "Artwork"}
              loading="lazy"
              className="h-auto w-full rounded-xl bg-line/40"
            />
          );
          const isSelected = selected.includes(a.id);
          return (
            <div key={a.id} className="mb-3 break-inside-avoid">
              {selecting ? (
                <button
                  type="button"
                  onClick={() => toggle(a.id)}
                  aria-pressed={isSelected}
                  className={`relative block w-full rounded-xl ring-offset-2 ${isSelected ? "ring-4 ring-brand" : ""}`}
                >
                  {img}
                  <span className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs text-white ${isSelected ? "bg-brand" : "bg-black/30"}`}>
                    {isSelected && "✓"}
                  </span>
                </button>
              ) : (
                <Link href={`${linkBase}/${a.id}`} className="group block">
                  <div className="overflow-hidden rounded-xl transition group-hover:shadow-md">{img}</div>
                  {a.title && <p className="mt-1 truncate text-sm">{a.title}</p>}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
