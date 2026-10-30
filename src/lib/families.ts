import { db } from "./db";
import { hashToken, newToken, sqlTime } from "./tokens";

export type Role = "owner" | "parent" | "viewer";
export const ROLES: Role[] = ["owner", "parent", "viewer"];
export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  parent: "Parent",
  viewer: "Viewer",
};
export const ROLE_HELP: Record<Role, string> = {
  owner: "Can do everything, including inviting and removing family members.",
  parent: "Can add kids, upload art, and build collections.",
  viewer: "Can look at everything in the family, but not change it.",
};

export type Family = { id: number; name: string; role: Role };
export type Member = {
  userId: number;
  name: string;
  email: string;
  role: Role;
  relationship: string | null;
};
export type Kid = {
  id: number;
  familyId: number;
  name: string;
  birthdate: string | null;
  color: string;
};
export type Invite = {
  id: number;
  email: string | null;
  role: Role;
  relationship: string | null;
  expiresAt: string;
  createdAt: string;
};

const INVITE_DAYS = 14;
const KID_COLORS = ["#f97316", "#0ea5e9", "#22c55e", "#a855f7", "#ec4899", "#eab308"];

export class FamilyError extends Error {}

export function can(role: Role | null, action: "view" | "edit" | "manage"): boolean {
  if (!role) return false;
  if (action === "view") return true;
  if (action === "edit") return role === "owner" || role === "parent";
  return role === "owner";
}

export function roleIn(familyId: number, userId: number): Role | null {
  const row = db()
    .prepare("SELECT role FROM family_members WHERE family_id = ? AND user_id = ?")
    .get(familyId, userId) as { role: Role } | undefined;
  return row?.role ?? null;
}

/** Returns the user's role, or throws if they may not take the action. */
export function requireRole(familyId: number, userId: number, action: "view" | "edit" | "manage"): Role {
  const role = roleIn(familyId, userId);
  if (!can(role, action)) throw new FamilyError("You don't have permission to do that.");
  return role!;
}

export function familiesFor(userId: number): Family[] {
  return db()
    .prepare(
      `SELECT f.id, f.name, m.role FROM families f
       JOIN family_members m ON m.family_id = f.id
       WHERE m.user_id = ? ORDER BY f.name`,
    )
    .all(userId) as Family[];
}

export function getFamily(familyId: number, userId: number): Family | null {
  const row = db()
    .prepare(
      `SELECT f.id, f.name, m.role FROM families f
       JOIN family_members m ON m.family_id = f.id
       WHERE f.id = ? AND m.user_id = ?`,
    )
    .get(familyId, userId) as Family | undefined;
  return row ?? null;
}

export function createFamily(name: string, ownerId: number): number {
  name = name.trim();
  if (!name) throw new FamilyError("Please give your family a name.");
  return db().transaction(() => {
    const { lastInsertRowid } = db().prepare("INSERT INTO families (name) VALUES (?)").run(name);
    const id = Number(lastInsertRowid);
    db()
      .prepare("INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, 'owner')")
      .run(id, ownerId);
    return id;
  })();
}

export function renameFamily(familyId: number, userId: number, name: string) {
  requireRole(familyId, userId, "manage");
  name = name.trim();
  if (!name) throw new FamilyError("Please give your family a name.");
  db().prepare("UPDATE families SET name = ? WHERE id = ?").run(name, familyId);
}

export function membersOf(familyId: number): Member[] {
  return db()
    .prepare(
      `SELECT u.id AS userId, u.name, u.email, m.role, m.relationship
       FROM family_members m JOIN users u ON u.id = m.user_id
       WHERE m.family_id = ?
       ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'parent' THEN 1 ELSE 2 END, u.name`,
    )
    .all(familyId) as Member[];
}

function ownerCount(familyId: number): number {
  return (
    db()
      .prepare("SELECT count(*) AS n FROM family_members WHERE family_id = ? AND role = 'owner'")
      .get(familyId) as { n: number }
  ).n;
}

export function updateMember(
  familyId: number,
  actorId: number,
  memberId: number,
  changes: { role: Role; relationship: string | null },
) {
  requireRole(familyId, actorId, "manage");
  const current = roleIn(familyId, memberId);
  if (!current) throw new FamilyError("That person isn't in this family.");
  if (current === "owner" && changes.role !== "owner" && ownerCount(familyId) === 1) {
    throw new FamilyError("Every family needs at least one owner. Make someone else an owner first.");
  }
  db()
    .prepare("UPDATE family_members SET role = ?, relationship = ? WHERE family_id = ? AND user_id = ?")
    .run(changes.role, changes.relationship?.trim() || null, familyId, memberId);
}

/** Owners can remove anyone; anyone can remove themselves (leave the family). */
export function removeMember(familyId: number, actorId: number, memberId: number) {
  if (actorId !== memberId) requireRole(familyId, actorId, "manage");
  const current = roleIn(familyId, memberId);
  if (!current) throw new FamilyError("That person isn't in this family.");
  if (current === "owner" && ownerCount(familyId) === 1) {
    throw new FamilyError("Every family needs at least one owner. Make someone else an owner first.");
  }
  db().prepare("DELETE FROM family_members WHERE family_id = ? AND user_id = ?").run(familyId, memberId);
}

export function kidsOf(familyId: number): Kid[] {
  return db()
    .prepare(
      "SELECT id, family_id AS familyId, name, birthdate, color FROM kids WHERE family_id = ? ORDER BY birthdate, name",
    )
    .all(familyId) as Kid[];
}

/** Returns the kid and the viewer's role in the kid's family, if they can see it. */
export function getKid(kidId: number, userId: number): { kid: Kid; role: Role } | null {
  const row = db()
    .prepare(
      `SELECT k.id, k.family_id AS familyId, k.name, k.birthdate, k.color, m.role
       FROM kids k JOIN family_members m ON m.family_id = k.family_id AND m.user_id = ?
       WHERE k.id = ?`,
    )
    .get(userId, kidId) as (Kid & { role: Role }) | undefined;
  if (!row) return null;
  const { role, ...kid } = row;
  return { kid, role };
}

function cleanBirthdate(value: string | null): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new FamilyError("Please enter the birthday as a date.");
  return value;
}

export function addKid(familyId: number, userId: number, input: { name: string; birthdate: string | null }): number {
  requireRole(familyId, userId, "edit");
  const name = input.name.trim();
  if (!name) throw new FamilyError("Please enter the kid's name.");
  const count = kidsOf(familyId).length;
  const { lastInsertRowid } = db()
    .prepare("INSERT INTO kids (family_id, name, birthdate, color) VALUES (?, ?, ?, ?)")
    .run(familyId, name, cleanBirthdate(input.birthdate), KID_COLORS[count % KID_COLORS.length]);
  return Number(lastInsertRowid);
}

export function updateKid(kidId: number, userId: number, input: { name: string; birthdate: string | null }) {
  const found = getKid(kidId, userId);
  if (!found || !can(found.role, "edit")) throw new FamilyError("You don't have permission to do that.");
  const name = input.name.trim();
  if (!name) throw new FamilyError("Please enter the kid's name.");
  db()
    .prepare("UPDATE kids SET name = ?, birthdate = ? WHERE id = ?")
    .run(name, cleanBirthdate(input.birthdate), kidId);
}

export function deleteKid(kidId: number, userId: number) {
  const found = getKid(kidId, userId);
  if (!found || !can(found.role, "manage")) throw new FamilyError("Only family owners can remove a kid.");
  db().prepare("DELETE FROM kids WHERE id = ?").run(kidId);
}

export function createInvite(
  familyId: number,
  actorId: number,
  input: { email: string | null; role: Role; relationship: string | null },
): string {
  requireRole(familyId, actorId, "manage");
  if (!ROLES.includes(input.role)) throw new FamilyError("Please pick a role.");
  const token = newToken();
  const expires = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
  db()
    .prepare(
      `INSERT INTO invites (family_id, token_hash, email, role, relationship, invited_by, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      familyId,
      hashToken(token),
      input.email?.trim().toLowerCase() || null,
      input.role,
      input.relationship?.trim() || null,
      actorId,
      sqlTime(expires),
    );
  return token;
}

export function pendingInvites(familyId: number): Invite[] {
  return db()
    .prepare(
      `SELECT id, email, role, relationship, expires_at AS expiresAt, created_at AS createdAt
       FROM invites WHERE family_id = ? AND accepted_at IS NULL AND expires_at > datetime('now')
       ORDER BY created_at DESC`,
    )
    .all(familyId) as Invite[];
}

export function revokeInvite(familyId: number, actorId: number, inviteId: number) {
  requireRole(familyId, actorId, "manage");
  db().prepare("DELETE FROM invites WHERE id = ? AND family_id = ? AND accepted_at IS NULL").run(inviteId, familyId);
}

export type InviteDetails = {
  id: number;
  familyId: number;
  familyName: string;
  inviterName: string | null;
  email: string | null;
  role: Role;
  relationship: string | null;
};

/** Looks up a usable (unaccepted, unexpired) invite by its token. */
export function findInvite(token: string): InviteDetails | null {
  const row = db()
    .prepare(
      `SELECT i.id, i.family_id AS familyId, f.name AS familyName, u.name AS inviterName,
              i.email, i.role, i.relationship
       FROM invites i JOIN families f ON f.id = i.family_id
       LEFT JOIN users u ON u.id = i.invited_by
       WHERE i.token_hash = ? AND i.accepted_at IS NULL AND i.expires_at > datetime('now')`,
    )
    .get(hashToken(token)) as InviteDetails | undefined;
  return row ?? null;
}

/** Adds the user to the invite's family. Returns the family id. */
export function acceptInvite(token: string, userId: number): number {
  const invite = findInvite(token);
  if (!invite) throw new FamilyError("This invite link has expired or was already used.");
  db().transaction(() => {
    const existing = roleIn(invite.familyId, userId);
    if (!existing) {
      db()
        .prepare("INSERT INTO family_members (family_id, user_id, role, relationship) VALUES (?, ?, ?, ?)")
        .run(invite.familyId, userId, invite.role, invite.relationship);
    } else if (ROLES.indexOf(invite.role) < ROLES.indexOf(existing)) {
      // Never downgrade someone who is already a member; only upgrade.
      db()
        .prepare("UPDATE family_members SET role = ? WHERE family_id = ? AND user_id = ?")
        .run(invite.role, invite.familyId, userId);
    }
    db()
      .prepare("UPDATE invites SET accepted_by = ?, accepted_at = datetime('now') WHERE id = ?")
      .run(userId, invite.id);
  })();
  return invite.familyId;
}
