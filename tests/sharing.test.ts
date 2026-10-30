import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser } from "../src/lib/accounts";
import { db, openDatabase, setDatabase } from "../src/lib/db";
import { acceptInvite, addKid, createFamily, createInvite, removeMember } from "../src/lib/families";
import { addArt, createCollection, getArt } from "../src/lib/gallery";
import { processImage } from "../src/lib/images";
import {
  createShareLink,
  findShareLink,
  linkCovers,
  markTagsSeen,
  revokeShareLink,
  shareLinks,
  tagMembers,
  tagsFor,
  tagsOn,
  unseenTagCount,
  untag,
} from "../src/lib/sharing";

let n = 0;
async function setup() {
  const mk = (name: string) => createUser({ email: `${name}${n++}@example.com`, name, password: "password123" });
  const owner = mk("Owner");
  const grandma = mk("Grandma");
  const grandpa = mk("Grandpa");
  const outsider = mk("Outsider");
  const family = createFamily("F", owner.id);
  for (const u of [grandma, grandpa]) {
    acceptInvite(createInvite(family, owner.id, { email: null, role: "viewer", relationship: null }), u.id);
  }
  const kid = addKid(family, owner.id, { name: "June", birthdate: null });
  const collection = createCollection(kid, owner.id, {
    title: "Preschool", school: null, teacher: null, grade: null, schoolYear: null, description: null,
  });
  const img = await processImage(await sharp({ create: { width: 40, height: 30, channels: 3, background: "#fff" } }).png().toBuffer());
  const art = addArt(kid, owner.id, img, { collectionId: collection, originalName: null, madeOn: null });
  const loose = addArt(kid, owner.id, img, { collectionId: null, originalName: null, madeOn: null });
  return { owner, grandma, grandpa, outsider, family, kid, collection, art, loose };
}

beforeEach(() => setDatabase(openDatabase(":memory:")));

describe("tags", () => {
  it("shows tagged art on the person's For you list until they've seen it", async () => {
    const s = await setup();
    expect(tagMembers({ artId: s.art }, s.owner.id, [s.grandma.id, s.owner.id], "Look at this one!")).toBe(1);
    expect(tagsOn({ artId: s.art }).map((t) => t.name)).toEqual(["Grandma"]);
    const [item] = tagsFor(s.grandma.id);
    expect(item).toMatchObject({ artId: s.art, taggedBy: "Owner", message: "Look at this one!", seen: false, kidName: "June" });
    expect(unseenTagCount(s.grandma.id)).toBe(1);
    markTagsSeen(s.grandma.id);
    expect(unseenTagCount(s.grandma.id)).toBe(0);
  });

  it("lets viewers tag each other, and re-tagging brings it back to the top", async () => {
    const s = await setup();
    tagMembers({ collectionId: s.collection }, s.grandma.id, [s.grandpa.id], null);
    markTagsSeen(s.grandpa.id);
    tagMembers({ collectionId: s.collection }, s.owner.id, [s.grandpa.id], "New ones added");
    expect(tagsFor(s.grandpa.id)).toHaveLength(1);
    expect(tagsFor(s.grandpa.id)[0]).toMatchObject({ taggedBy: "Owner", seen: false, previewArtId: s.art });
  });

  it("won't tag people outside the family, and hides tags after someone leaves", async () => {
    const s = await setup();
    expect(() => tagMembers({ artId: s.art }, s.owner.id, [s.outsider.id], null)).toThrow(/family/);
    expect(() => tagMembers({ artId: s.art }, s.outsider.id, [s.grandma.id], null)).toThrow();
    tagMembers({ artId: s.art }, s.owner.id, [s.grandma.id], null);
    removeMember(s.family, s.owner.id, s.grandma.id);
    expect(tagsFor(s.grandma.id)).toEqual([]);
  });

  it("lets people remove their own tag, but only editors remove others'", async () => {
    const s = await setup();
    tagMembers({ artId: s.art }, s.owner.id, [s.grandma.id, s.grandpa.id], null);
    expect(() => untag({ artId: s.art }, s.grandpa.id, s.grandma.id)).toThrow(/permission/);
    untag({ artId: s.art }, s.grandpa.id, s.grandpa.id);
    untag({ artId: s.art }, s.owner.id, s.grandma.id);
    expect(tagsOn({ artId: s.art })).toEqual([]);
  });
});

describe("share links", () => {
  it("shares only what the link points at", async () => {
    const s = await setup();
    const token = createShareLink({ collectionId: s.collection }, s.owner.id, { label: "Aunt Kim", expiresInDays: 30, allowDownload: false });
    const link = findShareLink(token)!;
    expect(link).toMatchObject({ label: "Aunt Kim", targetName: "Preschool", allowDownload: false });
    expect(linkCovers(link, getArt(s.art, s.owner.id)!.art)).toBe(true);
    expect(linkCovers(link, getArt(s.loose, s.owner.id)!.art)).toBe(false);

    const kidLink = findShareLink(createShareLink({ kidId: s.kid }, s.owner.id, { label: null, expiresInDays: null, allowDownload: true }))!;
    expect(kidLink.targetName).toBe("June's page");
    expect(linkCovers(kidLink, getArt(s.loose, s.owner.id)!.art)).toBe(true);
  });

  it("stops working when revoked or expired", async () => {
    const s = await setup();
    const token = createShareLink({ artId: s.art }, s.owner.id, { label: null, expiresInDays: 7, allowDownload: false });
    expect(shareLinks(s.family)).toHaveLength(1);
    revokeShareLink(findShareLink(token)!.id, s.owner.id);
    expect(findShareLink(token)).toBeNull();
    expect(shareLinks(s.family)).toHaveLength(0);

    const old = createShareLink({ artId: s.art }, s.owner.id, { label: null, expiresInDays: 7, allowDownload: false });
    db().prepare("UPDATE share_links SET expires_at = datetime('now', '-1 day')").run();
    expect(findShareLink(old)).toBeNull();
  });

  it("only lets parents and owners make or revoke links", async () => {
    const s = await setup();
    expect(() => createShareLink({ kidId: s.kid }, s.grandma.id, { label: null, expiresInDays: null, allowDownload: false })).toThrow(/parents/);
    const token = createShareLink({ kidId: s.kid }, s.owner.id, { label: null, expiresInDays: null, allowDownload: false });
    expect(() => revokeShareLink(findShareLink(token)!.id, s.grandma.id)).toThrow(/permission/);
    expect(() => createShareLink({ kidId: s.kid }, s.outsider.id, { label: null, expiresInDays: null, allowDownload: false })).toThrow();
  });
});
