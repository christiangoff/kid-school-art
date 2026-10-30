import { db } from "./db";
import { artById, artFor, collectionsFor, type Artwork } from "./gallery";
import { findShareLink, linkCovers, type ShareLink } from "./sharing";

/** Everything a share link shows, in display order. */
export function sharedArt(link: ShareLink): Artwork[] {
  if (link.artId) {
    const art = artById(link.artId);
    return art ? [art] : [];
  }
  if (link.collectionId) {
    const row = db().prepare("SELECT kid_id AS k FROM collections WHERE id = ?").get(link.collectionId) as { k: number } | undefined;
    return row ? artFor(row.k, link.collectionId) : [];
  }
  const kidId = link.kidId!;
  return [...collectionsFor(kidId).flatMap((c) => artFor(kidId, c.id)), ...artFor(kidId, "unsorted")];
}

/** The link and the piece, if the link works and covers it. */
export function sharedPiece(token: string, artId: number): { link: ShareLink; art: Artwork } | null {
  const link = findShareLink(token);
  const art = link && artById(artId);
  return link && art && linkCovers(link, art) ? { link, art } : null;
}

export function kidName(kidId: number): string {
  return (db().prepare("SELECT name FROM kids WHERE id = ?").get(kidId) as { name: string }).name;
}
