import fs from "node:fs";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser } from "../src/lib/accounts";
import { openDatabase, setDatabase } from "../src/lib/db";
import { acceptInvite, addKid, createFamily, createInvite, deleteKid } from "../src/lib/families";
import {
  addArt,
  artFor,
  collectionsFor,
  createCollection,
  deleteArt,
  deleteCollection,
  moveArt,
  neighbors,
  schoolYearFor,
  setCover,
  updateArt,
} from "../src/lib/gallery";
import { artFile, ImageError, processImage } from "../src/lib/images";

let n = 0;
function setup() {
  const owner = createUser({ email: `o${n++}@example.com`, name: "Owner", password: "password123" });
  const viewer = createUser({ email: `v${n++}@example.com`, name: "Viewer", password: "password123" });
  const family = createFamily("F", owner.id);
  acceptInvite(createInvite(family, owner.id, { email: null, role: "viewer", relationship: null }), viewer.id);
  const kid = addKid(family, owner.id, { name: "June", birthdate: null });
  return { owner, viewer, kid };
}

/** A 300x200 photo whose EXIF says it was taken with the phone turned sideways. */
function sidewaysPhoto() {
  return sharp({ create: { width: 300, height: 200, channels: 3, background: "#f97316" } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

const collection = (title: string) => ({
  title,
  school: "Little Oaks",
  teacher: "Ms. Rivera",
  grade: "Preschool",
  schoolYear: "2026-2027",
  description: null,
});

beforeEach(() => setDatabase(openDatabase(":memory:")));

describe("images", () => {
  it("turns phone photos upright and makes smaller copies", async () => {
    const img = await processImage(await sidewaysPhoto());
    expect(img.ext).toBe("jpg");
    expect([img.width, img.height]).toEqual([200, 300]);
    const thumb = await sharp(img.thumb).metadata();
    expect([thumb.format, thumb.width, thumb.height]).toEqual(["webp", 200, 300]);
  });

  it("rejects files that aren't images", async () => {
    await expect(processImage(Buffer.from("not an image"))).rejects.toBeInstanceOf(ImageError);
  });
});

describe("gallery", () => {
  it("files art into collections and keeps the files on disk", async () => {
    const { owner, kid } = setup();
    const c = createCollection(kid, owner.id, collection("Preschool art"));
    const img = await processImage(await sidewaysPhoto());
    const a = addArt(kid, owner.id, img, { collectionId: c, originalName: "scan.jpg", madeOn: "2026-10-01" });
    const b = addArt(kid, owner.id, img, { collectionId: c, originalName: null, madeOn: "2026-10-05" });
    expect(fs.existsSync(artFile(kid, a, "thumb", "jpg"))).toBe(true);

    const [summary] = collectionsFor(kid);
    expect(summary).toMatchObject({ title: "Preschool art", teacher: "Ms. Rivera", artCount: 2, previewIds: [b, a] });
    setCover(c, owner.id, a);
    expect(collectionsFor(kid)[0].previewIds[0]).toBe(a);

    expect(neighbors(artFor(kid, c)[0])).toMatchObject({ prev: null, next: a, total: 2 });

    deleteArt(a, owner.id);
    expect(fs.existsSync(artFile(kid, a, "thumb", "jpg"))).toBe(false);
    expect(collectionsFor(kid)[0].coverArtId).toBeNull();
  });

  it("keeps art unsorted when its collection is deleted", async () => {
    const { owner, kid } = setup();
    const c = createCollection(kid, owner.id, collection("Fall"));
    const img = await processImage(await sidewaysPhoto());
    const a = addArt(kid, owner.id, img, { collectionId: null, originalName: null, madeOn: null });
    moveArt(kid, owner.id, [a], c);
    expect(artFor(kid, c).map((x) => x.id)).toEqual([a]);
    deleteCollection(c, owner.id);
    expect(artFor(kid, "unsorted").map((x) => x.id)).toEqual([a]);
  });

  it("lets viewers look but not change anything", async () => {
    const { owner, viewer, kid } = setup();
    const img = await processImage(await sidewaysPhoto());
    expect(() => createCollection(kid, viewer.id, collection("Nope"))).toThrow(/permission/);
    expect(() => addArt(kid, viewer.id, img, { collectionId: null, originalName: null, madeOn: null })).toThrow(/permission/);
    const a = addArt(kid, owner.id, img, { collectionId: null, originalName: null, madeOn: null });
    expect(() => updateArt(a, viewer.id, { title: "x", note: null, madeOn: null, collectionId: null })).toThrow(/permission/);
  });

  it("won't put art in another kid's collection", async () => {
    const { owner, kid } = setup();
    const other = setup();
    const theirs = createCollection(other.kid, other.owner.id, collection("Theirs"));
    const img = await processImage(await sidewaysPhoto());
    expect(() => addArt(kid, owner.id, img, { collectionId: theirs, originalName: null, madeOn: null })).toThrow();
  });

  it("removes a kid's files along with the kid", async () => {
    const { owner, kid } = setup();
    const img = await processImage(await sidewaysPhoto());
    const a = addArt(kid, owner.id, img, { collectionId: null, originalName: null, madeOn: null });
    deleteKid(kid, owner.id);
    expect(fs.existsSync(artFile(kid, a, "original", "jpg"))).toBe(false);
  });

  it("works out the school year", () => {
    expect(schoolYearFor(new Date(2026, 9, 30))).toBe("2026-2027");
    expect(schoolYearFor(new Date(2027, 4, 1))).toBe("2026-2027");
    expect(schoolYearFor(new Date(2026, 6, 31))).toBe("2025-2026");
  });
});
