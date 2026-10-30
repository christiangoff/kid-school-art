import { BOOK_LAYOUTS, BOOK_SIZES, type Book, type BookSection } from "./books";
import type { Artwork, Collection } from "./gallery";
import { ageLabel } from "./format";

export const BLEED_IN = 0.125;
export const MARGIN_IN = 0.5;
/** Most photo book printers want at least this many pages. */
export const MIN_PRINT_PAGES = 20;

export type Caption = { title: string | null; note: string | null; meta: string | null };
export type Slot = { art: Artwork; caption: Caption; x: number; y: number; w: number; h: number };

export type Page =
  | { kind: "cover"; title: string; subtitle: string | null; artId: number | null }
  | { kind: "dedication"; text: string }
  | { kind: "section"; collection: Collection; count: number }
  | { kind: "art"; slots: Slot[] }
  | { kind: "blank" };

export type BookPlan = {
  /** Trim size in inches, without bleed. */
  width: number;
  height: number;
  bleed: number;
  pages: Page[];
  pieceCount: number;
};

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function captionFor(art: Artwork, book: Book, birthdate: string | null): Caption {
  const meta: string[] = [];
  if (book.showDate) {
    if (art.madeOn) meta.push(formatDate(art.madeOn));
    const age = birthdate ? ageLabel(birthdate, new Date(`${art.madeOn ?? art.createdAt.slice(0, 10)}T00:00:00`)) : "";
    if (age) meta.push(age);
  }
  return {
    title: book.showTitle ? art.title : null,
    note: book.showNote ? art.note : null,
    meta: meta.length ? meta.join(", ") : null,
  };
}

/**
 * Where each piece goes on its page, in inches from the top-left of the trim
 * area. Two-up pages sit side by side on wide pages and stacked on tall ones.
 */
function slotBoxes(perPage: number, count: number, width: number, height: number) {
  const gap = 0.35;
  const w = width - MARGIN_IN * 2;
  const h = height - MARGIN_IN * 2;
  const box = (col: number, row: number, cols: number, rows: number) => ({
    x: MARGIN_IN + col * ((w - gap * (cols - 1)) / cols + gap),
    y: MARGIN_IN + row * ((h - gap * (rows - 1)) / rows + gap),
    w: (w - gap * (cols - 1)) / cols,
    h: (h - gap * (rows - 1)) / rows,
  });
  if (perPage === 1 || count === 1) return [box(0, 0, 1, 1)];
  if (perPage === 2) return width >= height ? [box(0, 0, 2, 1), box(1, 0, 2, 1)] : [box(0, 0, 1, 2), box(0, 1, 1, 2)];
  return [box(0, 0, 2, 2), box(1, 0, 2, 2), box(0, 1, 2, 2), box(1, 1, 2, 2)].slice(0, count);
}

/** Lays out the whole book: cover, optional dedication, then a title page and art pages for each collection. */
export function planBook(book: Book, sections: BookSection[], birthdate: string | null, padToMinimum = false): BookPlan {
  const { width, height } = BOOK_SIZES[book.size];
  const perPage = BOOK_LAYOUTS[book.layout].perPage;
  const pages: Page[] = [];
  const all = sections.flatMap((s) => s.art);
  pages.push({ kind: "cover", title: book.title, subtitle: book.subtitle, artId: book.coverArtId ?? all[0]?.id ?? null });
  if (book.dedication) pages.push({ kind: "dedication", text: book.dedication });

  for (const section of sections) {
    if (section.art.length === 0) continue;
    pages.push({ kind: "section", collection: section.collection, count: section.art.length });
    for (let i = 0; i < section.art.length; i += perPage) {
      const chunk = section.art.slice(i, i + perPage);
      const boxes = slotBoxes(perPage, chunk.length, width, height);
      pages.push({
        kind: "art",
        slots: chunk.map((art, j) => ({ art, caption: captionFor(art, book, birthdate), ...boxes[j] })),
      });
    }
  }

  // Printers want an even page count, and photo books usually have a minimum.
  if (padToMinimum) while (pages.length < MIN_PRINT_PAGES) pages.push({ kind: "blank" });
  if (pages.length % 2 === 1) pages.push({ kind: "blank" });
  return { width, height, bleed: book.bleed ? BLEED_IN : 0, pages, pieceCount: all.length };
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, n >> 8, n].map((v) => {
    const c = (v & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or ink for the cover title, whichever reads better on the kid's colour. */
export function coverTextColor(background: string): "#ffffff" | "#2b2118" {
  const bg = luminance(background);
  const onWhite = 1.05 / (bg + 0.05);
  const onInk = (bg + 0.05) / (luminance("#2b2118") + 0.05);
  return onWhite >= onInk ? "#ffffff" : "#2b2118";
}
