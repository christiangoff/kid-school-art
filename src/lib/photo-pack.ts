import { zipSync } from "fflate";
import { captionFor } from "./book-plan";
import { bookSections, type Book } from "./books";
import { printImage } from "./book-pdf";

function fileSafe(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * The book's art as numbered JPEGs, in book order, with a captions file, for
 * services like Shutterfly or Mixbook that only take photos into their own editor.
 */
export async function photoPack(book: Book, birthdate: string | null): Promise<Uint8Array> {
  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  const captions: string[] = [`${book.title}${book.subtitle ? ` (${book.subtitle})` : ""}`, ""];
  let n = 0;
  for (const section of bookSections(book)) {
    if (section.art.length === 0) continue;
    captions.push(`== ${section.collection.title} ==`);
    for (const art of section.art) {
      n++;
      const name = `${String(n).padStart(3, "0")} - ${fileSafe(section.collection.title)}${art.title ? ` - ${fileSafe(art.title)}` : ""}.jpg`;
      // 12 inches at 300 dpi covers a full spread on most photo books.
      files[name] = [new Uint8Array(await printImage(art, 12)), { level: 0 }];
      const c = captionFor(art, book, birthdate);
      captions.push([name, c.title, c.note && `"${c.note}"`, c.meta].filter(Boolean).join("\n  "));
    }
    captions.push("");
  }
  files["captions.txt"] = [new TextEncoder().encode(captions.join("\n")), { level: 0 }];
  return zipSync(files);
}
