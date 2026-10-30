"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Button } from "./ui";
import { Icon } from "@/components/Icon";

type Item = { key: string; name: string; status: "waiting" | "uploading" | "done" | "failed"; error?: string };

const IMAGE_EXT = /\.(jpe?g|png|webp|tiff?|gif|heic|heif|avif)$/i;
const PARALLEL = 2;

/**
 * Adds art by drag and drop, a file picker (for scans and photo libraries),
 * the phone camera, or a whole folder at once.
 */
export function Uploader({ kidId, collectionId }: { kidId: number; collectionId?: number }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const files = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);

  function update(key: string, change: Partial<Item>) {
    setItems((all) => all.map((i) => (i.key === key ? { ...i, ...change } : i)));
  }

  async function upload(list: File[]) {
    const images = list.filter((f) => f.type.startsWith("image/") || IMAGE_EXT.test(f.name));
    if (images.length === 0) return;
    const queued = images.map((file, i) => ({ file, key: `${Date.now()}-${i}-${file.name}` }));
    setItems((all) => [...all, ...queued.map(({ key, file }) => ({ key, name: file.name, status: "waiting" as const }))]);
    setBusy(true);

    let next = 0;
    async function worker() {
      while (next < queued.length) {
        const { file, key } = queued[next++];
        update(key, { status: "uploading" });
        const body = new FormData();
        body.set("file", file);
        if (collectionId) body.set("collectionId", String(collectionId));
        try {
          const res = await fetch(`/api/kids/${kidId}/art`, { method: "POST", body });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error ?? "Upload failed.");
          update(key, { status: "done" });
        } catch (e) {
          update(key, { status: "failed", error: e instanceof Error ? e.message : "Upload failed." });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queued.length) }, worker));
    setBusy(false);
    router.refresh();
  }

  function picked(e: ChangeEvent<HTMLInputElement>) {
    upload(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  function dropped(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    upload(Array.from(e.dataTransfer.files));
  }

  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "failed");

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={dropped}
      className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
        dragging ? "border-brand bg-brand/5" : "border-line bg-white"
      }`}
    >
      <Icon name="upload" className="mx-auto size-8 text-muted" />
      <p className="mt-1 font-semibold">Drop scans or photos here</p>
      <p className="text-sm text-muted">JPEG, PNG, TIFF, or WebP, up to 40 MB each</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => files.current?.click()}>Choose files</Button>
        <Button type="button" variant="secondary" onClick={() => camera.current?.click()}>Take a photo</Button>
        <Button type="button" variant="secondary" onClick={() => folder.current?.click()}>Import a folder</Button>
      </div>
      <input ref={files} type="file" accept="image/*" multiple hidden onChange={picked} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={picked} />
      <input
        ref={folder}
        type="file"
        multiple
        hidden
        onChange={picked}
        {...({ webkitdirectory: "" } as Record<string, string>)}
      />

      {items.length > 0 && (
        <div className="mx-auto mt-5 max-w-md text-left text-sm">
          <p className="font-semibold">
            {busy ? `Uploading… ${done} of ${items.length}` : `Uploaded ${done} of ${items.length}`}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-full origin-left bg-brand transition-transform"
              style={{ transform: `scaleX(${(done + failed.length) / items.length})` }}
            />
          </div>
          {failed.length > 0 && (
            <ul className="mt-3 space-y-1 text-danger">
              {failed.map((f) => (
                <li key={f.key}>
                  <strong>{f.name}</strong>: {f.error}
                </li>
              ))}
            </ul>
          )}
          {!busy && (
            <button type="button" className="mt-2 min-h-8 text-sm font-semibold text-muted hover:text-ink" onClick={() => setItems([])}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
