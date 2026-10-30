import { db } from "./db";
import { can, FamilyError, getKid, type Kid, type Role } from "./families";
import { deleteArtFiles, writeArtFiles, type ProcessedImage } from "./images";

export type Collection = {
  id: number;
  kidId: number;
  title: string;
  school: string | null;
  teacher: string | null;
  grade: string | null;
  schoolYear: string | null;
  description: string | null;
  coverArtId: number | null;
};
export type CollectionSummary = Collection & { artCount: number; previewIds: number[] };
export type Artwork = {
  id: number;
  kidId: number;
  collectionId: number | null;
  title: string | null;
  note: string | null;
  madeOn: string | null;
  originalName: string | null;
  originalExt: string;
  width: number;
  height: number;
  createdAt: string;
};
export type CollectionInput = {
  title: string;
  school: string | null;
  teacher: string | null;
  grade: string | null;
  schoolYear: string | null;
  description: string | null;
};
export type ArtInput = { title: string | null; note: string | null; madeOn: string | null; collectionId: number | null };

export const GRADES = ["Preschool", "Pre-K", "Kindergarten", "1st grade", "2nd grade", "3rd grade", "4th grade", "5th grade"];

/** School years run August to July, written like "2026-2027". */
export function schoolYearFor(date: Date = new Date()): string {
  const start = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

const COLLECTION_COLUMNS = `c.id, c.kid_id AS kidId, c.title, c.school, c.teacher, c.grade,
  c.school_year AS schoolYear, c.description, c.cover_art_id AS coverArtId`;
const ART_COLUMNS = `a.id, a.kid_id AS kidId, a.collection_id AS collectionId, a.title, a.note,
  a.made_on AS madeOn, a.original_name AS originalName, a.original_ext AS originalExt,
  a.width, a.height, a.created_at AS createdAt`;
// Newest art first: by the date it was made when known, else when it was uploaded.
const ART_ORDER = "ORDER BY coalesce(a.made_on, a.created_at) DESC, a.id DESC";

function clean(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

function requireKidRole(kidId: number, userId: number, action: "view" | "edit"): { kid: Kid; role: Role } {
  const found = getKid(kidId, userId);
  if (!found || !can(found.role, action)) throw new FamilyError("You don’t have permission to do that.");
  return found;
}

function cleanDate(value: string | null): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new FamilyError("Please enter the date as a date.");
  return value;
}

// Collections

export function collectionsFor(kidId: number): CollectionSummary[] {
  const rows = db()
    .prepare(
      `SELECT ${COLLECTION_COLUMNS}, (SELECT count(*) FROM artworks a WHERE a.collection_id = c.id) AS artCount
       FROM collections c WHERE c.kid_id = ?
       ORDER BY c.school_year DESC, c.created_at DESC`,
    )
    .all(kidId) as (Collection & { artCount: number })[];
  const preview = db().prepare(`SELECT a.id FROM artworks a WHERE a.collection_id = ? ${ART_ORDER} LIMIT 4`);
  return rows.map((c) => {
    const ids = (preview.all(c.id) as { id: number }[]).map((r) => r.id);
    // Show the chosen cover first.
    if (c.coverArtId) ids.splice(0, ids.length, c.coverArtId, ...ids.filter((i) => i !== c.coverArtId).slice(0, 3));
    return { ...c, previewIds: ids };
  });
}

/** Returns the collection, its kid, and the viewer's role, if they can see it. */
export function getCollection(collectionId: number, userId: number) {
  const c = db()
    .prepare(`SELECT ${COLLECTION_COLUMNS} FROM collections c WHERE c.id = ?`)
    .get(collectionId) as Collection | undefined;
  if (!c) return null;
  const found = getKid(c.kidId, userId);
  return found ? { collection: c, ...found } : null;
}

function cleanCollection(input: CollectionInput): CollectionInput {
  const title = input.title.trim();
  if (!title) throw new FamilyError("Please give the collection a name.");
  return {
    title,
    school: clean(input.school),
    teacher: clean(input.teacher),
    grade: clean(input.grade),
    schoolYear: clean(input.schoolYear),
    description: clean(input.description),
  };
}

export function createCollection(kidId: number, userId: number, input: CollectionInput): number {
  requireKidRole(kidId, userId, "edit");
  const c = cleanCollection(input);
  const { lastInsertRowid } = db()
    .prepare(
      `INSERT INTO collections (kid_id, title, school, teacher, grade, school_year, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(kidId, c.title, c.school, c.teacher, c.grade, c.schoolYear, c.description);
  return Number(lastInsertRowid);
}

export function updateCollection(collectionId: number, userId: number, input: CollectionInput) {
  const found = getCollection(collectionId, userId);
  if (!found || !can(found.role, "edit")) throw new FamilyError("You don’t have permission to do that.");
  const c = cleanCollection(input);
  db()
    .prepare(
      `UPDATE collections SET title = ?, school = ?, teacher = ?, grade = ?, school_year = ?, description = ?
       WHERE id = ?`,
    )
    .run(c.title, c.school, c.teacher, c.grade, c.schoolYear, c.description, collectionId);
}

/** Deletes the collection. Its art stays on the kid's page, unsorted. */
export function deleteCollection(collectionId: number, userId: number): number {
  const found = getCollection(collectionId, userId);
  if (!found || !can(found.role, "edit")) throw new FamilyError("You don’t have permission to do that.");
  db().prepare("DELETE FROM collections WHERE id = ?").run(collectionId);
  return found.kid.id;
}

export function setCover(collectionId: number, userId: number, artId: number) {
  const found = getCollection(collectionId, userId);
  if (!found || !can(found.role, "edit")) throw new FamilyError("You don’t have permission to do that.");
  const art = db().prepare("SELECT collection_id AS c FROM artworks WHERE id = ?").get(artId) as { c: number } | undefined;
  if (art?.c !== collectionId) throw new FamilyError("That art isn’t in this collection.");
  db().prepare("UPDATE collections SET cover_art_id = ? WHERE id = ?").run(artId, collectionId);
}

/** Values already used for this kid, to suggest when making a new collection. */
export function collectionSuggestions(kidId: number) {
  const distinct = (col: string) =>
    (
      db()
        .prepare(`SELECT DISTINCT ${col} AS v FROM collections WHERE kid_id = ? AND ${col} IS NOT NULL ORDER BY created_at DESC`)
        .all(kidId) as { v: string }[]
    ).map((r) => r.v);
  return { schools: distinct("school"), teachers: distinct("teacher") };
}

// Art

export function artFor(kidId: number, collectionId: number | null | "unsorted"): Artwork[] {
  if (collectionId === "unsorted") {
    return db()
      .prepare(`SELECT ${ART_COLUMNS} FROM artworks a WHERE a.kid_id = ? AND a.collection_id IS NULL ${ART_ORDER}`)
      .all(kidId) as Artwork[];
  }
  if (collectionId === null) {
    return db().prepare(`SELECT ${ART_COLUMNS} FROM artworks a WHERE a.kid_id = ? ${ART_ORDER}`).all(kidId) as Artwork[];
  }
  return db()
    .prepare(`SELECT ${ART_COLUMNS} FROM artworks a WHERE a.kid_id = ? AND a.collection_id = ? ${ART_ORDER}`)
    .all(kidId, collectionId) as Artwork[];
}

export function getArt(artId: number, userId: number) {
  const art = db().prepare(`SELECT ${ART_COLUMNS} FROM artworks a WHERE a.id = ?`).get(artId) as Artwork | undefined;
  if (!art) return null;
  const found = getKid(art.kidId, userId);
  return found ? { art, ...found } : null;
}

function checkCollection(kidId: number, collectionId: number | null) {
  if (collectionId === null) return;
  const row = db().prepare("SELECT kid_id AS k FROM collections WHERE id = ?").get(collectionId) as { k: number } | undefined;
  if (row?.k !== kidId) throw new FamilyError("That collection belongs to someone else.");
}

export function addArt(
  kidId: number,
  userId: number,
  image: ProcessedImage,
  input: { collectionId: number | null; originalName: string | null; madeOn: string | null },
): number {
  requireKidRole(kidId, userId, "edit");
  checkCollection(kidId, input.collectionId);
  return db().transaction(() => {
    const { lastInsertRowid } = db()
      .prepare(
        `INSERT INTO artworks (kid_id, collection_id, made_on, original_name, original_ext, width, height, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(kidId, input.collectionId, cleanDate(input.madeOn), clean(input.originalName), image.ext, image.width, image.height, userId);
    const id = Number(lastInsertRowid);
    // Written inside the transaction, so a failed write leaves no half-saved art.
    writeArtFiles(kidId, id, image);
    return id;
  })();
}

export function updateArt(artId: number, userId: number, input: ArtInput) {
  const found = getArt(artId, userId);
  if (!found || !can(found.role, "edit")) throw new FamilyError("You don’t have permission to do that.");
  checkCollection(found.art.kidId, input.collectionId);
  db()
    .prepare("UPDATE artworks SET title = ?, note = ?, made_on = ?, collection_id = ? WHERE id = ?")
    .run(clean(input.title), clean(input.note), cleanDate(input.madeOn), input.collectionId, artId);
  if (found.art.collectionId !== input.collectionId) clearCoverIf(artId);
}

function clearCoverIf(artId: number) {
  db().prepare("UPDATE collections SET cover_art_id = NULL WHERE cover_art_id = ?").run(artId);
}

/** Moves several pieces at once, e.g. from the unsorted pile into a collection. */
export function moveArt(kidId: number, userId: number, artIds: number[], collectionId: number | null) {
  requireKidRole(kidId, userId, "edit");
  checkCollection(kidId, collectionId);
  const move = db().prepare("UPDATE artworks SET collection_id = ? WHERE id = ? AND kid_id = ?");
  db().transaction(() => {
    for (const id of artIds) {
      move.run(collectionId, id, kidId);
      clearCoverIf(id);
    }
  })();
}

export function deleteArt(artId: number, userId: number): Artwork {
  const found = getArt(artId, userId);
  if (!found || !can(found.role, "edit")) throw new FamilyError("You don’t have permission to do that.");
  db().transaction(() => {
    clearCoverIf(artId);
    db().prepare("DELETE FROM artworks WHERE id = ?").run(artId);
  })();
  deleteArtFiles(found.art.kidId, artId, found.art.originalExt);
  return found.art;
}

/** The pieces before and after this one in the same collection (or the unsorted pile). */
export function neighbors(art: Artwork): { prev: number | null; next: number | null; index: number; total: number } {
  const list = artFor(art.kidId, art.collectionId ?? "unsorted");
  const index = list.findIndex((a) => a.id === art.id);
  return {
    prev: index > 0 ? list[index - 1].id : null,
    next: index < list.length - 1 ? list[index + 1].id : null,
    index,
    total: list.length,
  };
}

/** Looks up art without a permission check, for share links that have already been checked. */
export function artById(artId: number): Artwork | null {
  return (db().prepare(`SELECT ${ART_COLUMNS} FROM artworks a WHERE a.id = ?`).get(artId) as Artwork | undefined) ?? null;
}

/** Looks up a collection without a permission check, for share links. */
export function getCollectionById(collectionId: number): Collection | null {
  return (db().prepare(`SELECT ${COLLECTION_COLUMNS} FROM collections c WHERE c.id = ?`).get(collectionId) as Collection | undefined) ?? null;
}
