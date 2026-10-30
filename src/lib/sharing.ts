import { db } from "./db";
import { can, FamilyError, getKid, membersOf, roleIn } from "./families";
import { getArt, getCollection, type Artwork } from "./gallery";
import { newToken, sqlTime } from "./tokens";

// Tags

export type TagTarget = { artId: number } | { collectionId: number };

export type TagItem = {
  id: number;
  artId: number | null;
  collectionId: number | null;
  title: string;
  kidName: string;
  taggedBy: string | null;
  message: string | null;
  seen: boolean;
  createdAt: string;
  previewArtId: number | null;
};

/** Finds the family a tag or share target belongs to, and checks the user may see it. */
function resolveTarget(target: TagTarget | ShareTarget, userId: number) {
  if ("artId" in target) {
    const found = getArt(target.artId, userId);
    if (!found) throw new FamilyError("That art doesn’t exist.");
    return { familyId: found.kid.familyId, role: found.role };
  }
  if ("collectionId" in target) {
    const found = getCollection(target.collectionId, userId);
    if (!found) throw new FamilyError("That collection doesn’t exist.");
    return { familyId: found.kid.familyId, role: found.role };
  }
  const found = getKid(target.kidId, userId);
  if (!found) throw new FamilyError("That kid doesn’t exist.");
  return { familyId: found.kid.familyId, role: found.role };
}

/**
 * Tags family members on a piece or a collection, so it shows up on their
 * "For you" page. Anyone in the family can tag, viewers included: pointing
 * Grandpa at something Grandma loved is the point. Returns how many were tagged.
 */
export function tagMembers(target: TagTarget, actorId: number, userIds: number[], message: string | null): number {
  const { familyId } = resolveTarget(target, actorId);
  const artId = "artId" in target ? target.artId : null;
  const collectionId = "collectionId" in target ? target.collectionId : null;
  const insert = db().prepare(
    `INSERT INTO tags (user_id, art_id, collection_id, tagged_by, message) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT DO UPDATE SET tagged_by = excluded.tagged_by, message = excluded.message,
       seen_at = NULL, created_at = datetime('now')`,
  );
  let count = 0;
  db().transaction(() => {
    for (const userId of new Set(userIds)) {
      if (userId === actorId) continue;
      if (!roleIn(familyId, userId)) throw new FamilyError("You can only tag people in this family.");
      insert.run(userId, artId, collectionId, actorId, message?.trim() || null);
      count++;
    }
  })();
  return count;
}

export function untag(target: TagTarget, actorId: number, userId: number) {
  const { role } = resolveTarget(target, actorId);
  // People can remove their own tags; editors can remove anyone's.
  if (userId !== actorId && !can(role, "edit")) throw new FamilyError("You don’t have permission to do that.");
  if ("artId" in target) db().prepare("DELETE FROM tags WHERE user_id = ? AND art_id = ?").run(userId, target.artId);
  else db().prepare("DELETE FROM tags WHERE user_id = ? AND collection_id = ?").run(userId, target.collectionId);
}

/** Who is tagged on a target. */
export function tagsOn(target: TagTarget): { userId: number; name: string }[] {
  const where = "artId" in target ? "t.art_id = ?" : "t.collection_id = ?";
  const id = "artId" in target ? target.artId : target.collectionId;
  return db()
    .prepare(`SELECT u.id AS userId, u.name FROM tags t JOIN users u ON u.id = t.user_id WHERE ${where} ORDER BY u.name`)
    .all(id) as { userId: number; name: string }[];
}

/** People who could be tagged on a target: everyone else in the family. */
export function taggableMembers(familyId: number, actorId: number) {
  return membersOf(familyId).filter((m) => m.userId !== actorId);
}

/** What the user has been tagged in, newest first. Only things they can still see. */
export function tagsFor(userId: number): TagItem[] {
  const rows = db()
    .prepare(
      `SELECT t.id, t.art_id AS artId, t.collection_id AS collectionId, t.message, t.seen_at AS seenAt,
              t.created_at AS createdAt, by.name AS taggedBy,
              coalesce(a.title, c.title) AS title, k.name AS kidName,
              coalesce(a.id, c.cover_art_id,
                (SELECT a2.id FROM artworks a2 WHERE a2.collection_id = c.id ORDER BY a2.id DESC LIMIT 1)) AS previewArtId
       FROM tags t
       LEFT JOIN artworks a ON a.id = t.art_id
       LEFT JOIN collections c ON c.id = t.collection_id
       JOIN kids k ON k.id = coalesce(a.kid_id, c.kid_id)
       JOIN family_members m ON m.family_id = k.family_id AND m.user_id = t.user_id
       LEFT JOIN users by ON by.id = t.tagged_by
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC, t.id DESC`,
    )
    .all(userId) as (Omit<TagItem, "seen" | "title"> & { seenAt: string | null; title: string | null })[];
  return rows.map(({ seenAt, title, ...r }) => ({
    ...r,
    title: title ?? (r.artId ? `A piece by ${r.kidName}` : "A collection"),
    seen: seenAt !== null,
  }));
}

export function unseenTagCount(userId: number): number {
  return (
    db().prepare("SELECT count(*) AS n FROM tags WHERE user_id = ? AND seen_at IS NULL").get(userId) as { n: number }
  ).n;
}

export function markTagsSeen(userId: number) {
  db().prepare("UPDATE tags SET seen_at = datetime('now') WHERE user_id = ? AND seen_at IS NULL").run(userId);
}

// Share links

export type ShareTarget = { kidId: number } | { collectionId: number } | { artId: number };

export type ShareLink = {
  id: number;
  token: string;
  kidId: number | null;
  collectionId: number | null;
  artId: number | null;
  label: string | null;
  allowDownload: boolean;
  expiresAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  targetName: string;
};

export const EXPIRY_OPTIONS = [
  { value: "7", label: "In a week" },
  { value: "30", label: "In a month" },
  { value: "90", label: "In 3 months" },
  { value: "365", label: "In a year" },
  { value: "never", label: "Never" },
] as const;

const LINK_COLUMNS = `s.id, s.token, s.kid_id AS kidId, s.collection_id AS collectionId, s.art_id AS artId, s.label,
  s.allow_download AS allowDownload, s.expires_at AS expiresAt, s.view_count AS viewCount,
  s.last_viewed_at AS lastViewedAt, s.created_at AS createdAt, u.name AS createdBy,
  coalesce(k.name || '''s page', c.title, a.title, 'A piece of art') AS targetName`;
const LINK_JOINS = `LEFT JOIN users u ON u.id = s.created_by
  LEFT JOIN kids k ON k.id = s.kid_id
  LEFT JOIN collections c ON c.id = s.collection_id
  LEFT JOIN artworks a ON a.id = s.art_id`;
const ACTIVE = "s.revoked_at IS NULL AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))";

function toLink(row: Omit<ShareLink, "allowDownload"> & { allowDownload: number }): ShareLink {
  return { ...row, allowDownload: row.allowDownload === 1 };
}

/** Parents and owners can make read-only links for people who don't have an account. */
export function createShareLink(
  target: ShareTarget,
  actorId: number,
  input: { label: string | null; expiresInDays: number | null; allowDownload: boolean },
): string {
  const { familyId, role } = resolveTarget(target, actorId);
  if (!can(role, "edit")) throw new FamilyError("Only parents and owners can make share links.");
  const token = newToken();
  const expires = input.expiresInDays ? sqlTime(new Date(Date.now() + input.expiresInDays * 86400000)) : null;
  db()
    .prepare(
      `INSERT INTO share_links (token, family_id, kid_id, collection_id, art_id, label, allow_download, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      token,
      familyId,
      "kidId" in target ? target.kidId : null,
      "collectionId" in target ? target.collectionId : null,
      "artId" in target ? target.artId : null,
      input.label?.trim() || null,
      input.allowDownload ? 1 : 0,
      expires,
      actorId,
    );
  return token;
}

/** Active links for one target, or for the whole family when no target is given. */
export function shareLinks(familyId: number, target?: ShareTarget): ShareLink[] {
  let where = `s.family_id = ? AND ${ACTIVE}`;
  const args: number[] = [familyId];
  if (target) {
    const [col, id] =
      "kidId" in target ? ["kid_id", target.kidId] : "collectionId" in target ? ["collection_id", target.collectionId] : ["art_id", target.artId];
    where += ` AND s.${col} = ?`;
    args.push(id);
  }
  return (
    db().prepare(`SELECT ${LINK_COLUMNS} FROM share_links s ${LINK_JOINS} WHERE ${where} ORDER BY s.created_at DESC`).all(...args) as Parameters<typeof toLink>[0][]
  ).map(toLink);
}

export function revokeShareLink(linkId: number, actorId: number) {
  const row = db().prepare("SELECT family_id AS f FROM share_links WHERE id = ?").get(linkId) as { f: number } | undefined;
  if (!row || !can(roleIn(row.f, actorId), "edit")) throw new FamilyError("You don’t have permission to do that.");
  db().prepare("UPDATE share_links SET revoked_at = datetime('now') WHERE id = ?").run(linkId);
}

/** Looks up a link that still works. */
export function findShareLink(token: string): (ShareLink & { familyId: number }) | null {
  const row = db()
    .prepare(`SELECT ${LINK_COLUMNS}, s.family_id AS familyId FROM share_links s ${LINK_JOINS} WHERE s.token = ? AND ${ACTIVE}`)
    .get(token) as (Parameters<typeof toLink>[0] & { familyId: number }) | undefined;
  return row ? { ...toLink(row), familyId: row.familyId } : null;
}

export function recordShareView(linkId: number) {
  db().prepare("UPDATE share_links SET view_count = view_count + 1, last_viewed_at = datetime('now') WHERE id = ?").run(linkId);
}

/** Whether a piece of art is inside what a link shares. */
export function linkCovers(link: ShareLink, art: Pick<Artwork, "id" | "kidId" | "collectionId">): boolean {
  if (link.artId) return art.id === link.artId;
  if (link.collectionId) return art.collectionId === link.collectionId;
  return art.kidId === link.kidId;
}
