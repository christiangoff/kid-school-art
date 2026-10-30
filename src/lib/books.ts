import { db } from "./db";
import { can, FamilyError, getKid, type Kid, type Role } from "./families";
import { artFor, collectionsFor, getCollectionById, type Artwork, type Collection } from "./gallery";

export const BOOK_SIZES = {
  square8: { label: '8" × 8" square', width: 8, height: 8 },
  square85: { label: '8.5" × 8.5" square', width: 8.5, height: 8.5 },
  square12: { label: '12" × 12" square', width: 12, height: 12 },
  portrait: { label: '8.5" × 11" portrait', width: 8.5, height: 11 },
  landscape: { label: '11" × 8.5" landscape', width: 11, height: 8.5 },
  landscape10: { label: '10" × 8" landscape', width: 10, height: 8 },
} as const;
export type BookSize = keyof typeof BOOK_SIZES;

export const BOOK_LAYOUTS = {
  one: { label: "One piece per page", perPage: 1 },
  two: { label: "Two pieces per page", perPage: 2 },
  four: { label: "Four pieces per page", perPage: 4 },
} as const;
export type BookLayout = keyof typeof BOOK_LAYOUTS;

export type Book = {
  id: number;
  kidId: number;
  title: string;
  subtitle: string | null;
  size: BookSize;
  layout: BookLayout;
  bleed: boolean;
  showTitle: boolean;
  showNote: boolean;
  showDate: boolean;
  coverArtId: number | null;
  dedication: string | null;
  updatedAt: string;
};

export type BookSettings = Omit<Book, "id" | "kidId" | "coverArtId" | "updatedAt">;

const COLUMNS = `b.id, b.kid_id AS kidId, b.title, b.subtitle, b.size, b.layout, b.bleed,
  b.show_title AS showTitle, b.show_note AS showNote, b.show_date AS showDate,
  b.cover_art_id AS coverArtId, b.dedication, b.updated_at AS updatedAt`;

type Row = Omit<Book, "bleed" | "showTitle" | "showNote" | "showDate"> & {
  bleed: number;
  showTitle: number;
  showNote: number;
  showDate: number;
};

function toBook(r: Row): Book {
  return { ...r, bleed: !!r.bleed, showTitle: !!r.showTitle, showNote: !!r.showNote, showDate: !!r.showDate };
}

function requireEdit(kidId: number, userId: number): { kid: Kid; role: Role } {
  const found = getKid(kidId, userId);
  if (!found || !can(found.role, "edit")) throw new FamilyError("Only parents and owners can make books.");
  return found;
}

export function booksFor(kidId: number): (Book & { pieceCount: number })[] {
  return (db().prepare(`SELECT ${COLUMNS} FROM books b WHERE b.kid_id = ? ORDER BY b.updated_at DESC`).all(kidId) as Row[])
    .map(toBook)
    .map((b) => ({ ...b, pieceCount: bookArt(b).length }));
}

/** The book, its kid, and the viewer's role, if they can see it. */
export function getBook(bookId: number, userId: number) {
  const row = db().prepare(`SELECT ${COLUMNS} FROM books b WHERE b.id = ?`).get(bookId) as Row | undefined;
  if (!row) return null;
  const found = getKid(row.kidId, userId);
  return found ? { book: toBook(row), ...found } : null;
}

function requireBookEdit(bookId: number, userId: number) {
  const found = getBook(bookId, userId);
  if (!found || !can(found.role, "edit")) throw new FamilyError("Only parents and owners can change books.");
  return found;
}

function cleanSettings(s: BookSettings): BookSettings {
  const title = s.title.trim();
  if (!title) throw new FamilyError("Please give the book a title.");
  if (!(s.size in BOOK_SIZES)) throw new FamilyError("Please pick a book size.");
  if (!(s.layout in BOOK_LAYOUTS)) throw new FamilyError("Please pick a layout.");
  return { ...s, title, subtitle: s.subtitle?.trim() || null, dedication: s.dedication?.trim() || null };
}

export function createBook(kidId: number, userId: number, settings: BookSettings, collectionIds: number[]): number {
  requireEdit(kidId, userId);
  const s = cleanSettings(settings);
  return db().transaction(() => {
    const { lastInsertRowid } = db()
      .prepare(
        `INSERT INTO books (kid_id, title, subtitle, size, layout, bleed, show_title, show_note, show_date, dedication, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(kidId, s.title, s.subtitle, s.size, s.layout, +s.bleed, +s.showTitle, +s.showNote, +s.showDate, s.dedication, userId);
    const id = Number(lastInsertRowid);
    writeCollections(id, kidId, collectionIds);
    return id;
  })();
}

export function updateBook(bookId: number, userId: number, settings: BookSettings, collectionIds: number[]) {
  const { book } = requireBookEdit(bookId, userId);
  const s = cleanSettings(settings);
  db().transaction(() => {
    db()
      .prepare(
        `UPDATE books SET title = ?, subtitle = ?, size = ?, layout = ?, bleed = ?, show_title = ?, show_note = ?,
           show_date = ?, dedication = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(s.title, s.subtitle, s.size, s.layout, +s.bleed, +s.showTitle, +s.showNote, +s.showDate, s.dedication, bookId);
    writeCollections(bookId, book.kidId, collectionIds);
  })();
}

/**
 * Saves which collections are in the book. Ones already in it keep their
 * place; new ones go at the end, oldest first.
 */
function writeCollections(bookId: number, kidId: number, collectionIds: number[]) {
  const mine = new Set(collectionsFor(kidId).map((c) => c.id));
  const wanted = new Set(collectionIds.filter((id) => mine.has(id)));
  const kept = bookCollections(bookId).map((c) => c.id).filter((id) => wanted.has(id));
  const added = [...wanted].filter((id) => !kept.includes(id)).sort((a, b) => a - b);
  db().prepare("DELETE FROM book_collections WHERE book_id = ?").run(bookId);
  const insert = db().prepare("INSERT INTO book_collections (book_id, collection_id, position) VALUES (?, ?, ?)");
  [...kept, ...added].forEach((id, i) => insert.run(bookId, id, i));
}

export function deleteBook(bookId: number, userId: number): number {
  const { book } = requireBookEdit(bookId, userId);
  db().prepare("DELETE FROM books WHERE id = ?").run(bookId);
  return book.kidId;
}

/** Moves a collection one place earlier or later in the book. */
export function moveBookCollection(bookId: number, userId: number, collectionId: number, direction: -1 | 1) {
  requireBookEdit(bookId, userId);
  const ids = bookCollections(bookId).map((c) => c.id);
  const i = ids.indexOf(collectionId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const set = db().prepare("UPDATE book_collections SET position = ? WHERE book_id = ? AND collection_id = ?");
  db().transaction(() => ids.forEach((id, pos) => set.run(pos, bookId, id)))();
  touch(bookId);
}

export function setArtIncluded(bookId: number, userId: number, artId: number, included: boolean) {
  requireBookEdit(bookId, userId);
  if (included) db().prepare("DELETE FROM book_excluded_art WHERE book_id = ? AND art_id = ?").run(bookId, artId);
  else db().prepare("INSERT OR IGNORE INTO book_excluded_art (book_id, art_id) VALUES (?, ?)").run(bookId, artId);
  touch(bookId);
}

export function setBookCover(bookId: number, userId: number, artId: number | null) {
  const { book } = requireBookEdit(bookId, userId);
  if (artId !== null && !artFor(book.kidId, null).some((a) => a.id === artId)) {
    throw new FamilyError("That art belongs to someone else.");
  }
  db().prepare("UPDATE books SET cover_art_id = ?, updated_at = datetime('now') WHERE id = ?").run(artId, bookId);
}

function touch(bookId: number) {
  db().prepare("UPDATE books SET updated_at = datetime('now') WHERE id = ?").run(bookId);
}

export function bookCollections(bookId: number): Collection[] {
  return (
    db().prepare("SELECT collection_id AS id FROM book_collections WHERE book_id = ? ORDER BY position").all(bookId) as { id: number }[]
  )
    .map((r) => getCollectionById(r.id))
    .filter((c): c is Collection => c !== null);
}

export function excludedArt(bookId: number): Set<number> {
  return new Set(
    (db().prepare("SELECT art_id AS id FROM book_excluded_art WHERE book_id = ?").all(bookId) as { id: number }[]).map((r) => r.id),
  );
}

export type BookSection = { collection: Collection; art: Artwork[]; excluded: Artwork[] };

/** The book's collections in order, oldest piece first, split into what's in and what's left out. */
export function bookSections(book: Book): BookSection[] {
  const out = excludedArt(book.id);
  return bookCollections(book.id).map((collection) => {
    const all = artFor(book.kidId, collection.id).reverse();
    return { collection, art: all.filter((a) => !out.has(a.id)), excluded: all.filter((a) => out.has(a.id)) };
  });
}

export function bookArt(book: Book): Artwork[] {
  return bookSections(book).flatMap((s) => s.art);
}
