import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, setDatabase } from "../src/lib/db";
import { createSession, createUser, deleteSession, openSignupAllowed, userForSession, verifyPassword } from "../src/lib/accounts";
import {
  acceptInvite,
  addKid,
  createFamily,
  createInvite,
  familiesFor,
  findInvite,
  kidsOf,
  membersOf,
  removeMember,
  revokeInvite,
  updateMember,
} from "../src/lib/families";

let n = 0;
function user(name: string) {
  return createUser({ email: `${name.toLowerCase()}${n++}@example.com`, name, password: "password123" });
}

beforeEach(() => setDatabase(openDatabase(":memory:")));

describe("accounts", () => {
  it("opens signup only until the first user exists", () => {
    expect(openSignupAllowed()).toBe(true);
    user("Christian");
    expect(openSignupAllowed()).toBe(false);
  });

  it("checks passwords and sessions", () => {
    const u = createUser({ email: "Dad@Example.com", name: "Dad", password: "password123" });
    expect(verifyPassword("dad@example.com", "password123")?.id).toBe(u.id);
    expect(verifyPassword("dad@example.com", "wrong-password")).toBeNull();
    const { token } = createSession(u.id);
    expect(userForSession(token)?.id).toBe(u.id);
    deleteSession(token);
    expect(userForSession(token)).toBeNull();
  });

  it("rejects duplicate emails and short passwords", () => {
    user("A");
    expect(() => createUser({ email: "x@example.com", name: "X", password: "short" })).toThrow(/8 characters/);
  });
});

describe("families", () => {
  it("makes the creator an owner who can add kids", () => {
    const owner = user("Owner");
    const id = createFamily("The Goffs", owner.id);
    expect(familiesFor(owner.id)).toEqual([{ id, name: "The Goffs", role: "owner" }]);
    addKid(id, owner.id, { name: "June", birthdate: "2021-04-02" });
    expect(kidsOf(id).map((k) => k.name)).toEqual(["June"]);
  });

  it("lets invited people join with the invite's role", () => {
    const owner = user("Owner");
    const grandma = user("Grandma");
    const family = createFamily("The Goffs", owner.id);
    const token = createInvite(family, owner.id, { email: null, role: "viewer", relationship: "Grandma" });
    expect(findInvite(token)?.familyName).toBe("The Goffs");
    acceptInvite(token, grandma.id);
    expect(membersOf(family).find((m) => m.userId === grandma.id)).toMatchObject({
      role: "viewer",
      relationship: "Grandma",
    });
    expect(findInvite(token)).toBeNull();
    expect(() => addKid(family, grandma.id, { name: "Sneaky", birthdate: null })).toThrow(/permission/);
  });

  it("only lets owners invite, and revoked invites stop working", () => {
    const owner = user("Owner");
    const parent = user("Parent");
    const family = createFamily("F", owner.id);
    acceptInvite(createInvite(family, owner.id, { email: null, role: "parent", relationship: null }), parent.id);
    expect(() => createInvite(family, parent.id, { email: null, role: "viewer", relationship: null })).toThrow();
    const token = createInvite(family, owner.id, { email: null, role: "viewer", relationship: null });
    revokeInvite(family, owner.id, findInvite(token)!.id);
    expect(findInvite(token)).toBeNull();
  });

  it("keeps at least one owner", () => {
    const owner = user("Owner");
    const family = createFamily("F", owner.id);
    expect(() => updateMember(family, owner.id, owner.id, { role: "viewer", relationship: null })).toThrow(/owner/);
    expect(() => removeMember(family, owner.id, owner.id)).toThrow(/owner/);
  });

  it("never downgrades an existing member who accepts an invite", () => {
    const owner = user("Owner");
    const family = createFamily("F", owner.id);
    acceptInvite(createInvite(family, owner.id, { email: null, role: "viewer", relationship: null }), owner.id);
    expect(membersOf(family)[0].role).toBe("owner");
  });
});
