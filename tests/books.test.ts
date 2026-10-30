import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser } from "../src/lib/accounts";
import { openDatabase, setDatabase } from "../src/lib/db";
import { addKid, createFamily } from "../src/lib/families";
import { addArt, createCollection, updateArt } from "../src/lib/gallery";
import { processImage } from "../src/lib/images";
import { bookArt, bookSections, createBook, getBook, moveBookCollection, setArtIncluded, updateBook, type BookSettings } from "../src/lib/books";
import { planBook } from "../src/lib/book-plan";
import { renderBookPdf } from "../src/lib/book-pdf";
import { photoPack } from "../src/lib/photo-pack";

let n = 0;
const settings = (over: Partial<BookSettings> = {}): BookSettings => ({
  title: "June's Art", subtitle: "2026–2027", size: "square8", layout: "one", bleed: true,
  showTitle: true, showNote: true, showDate: true, dedication: null, ...over,
});

async function setup() {
  const owner = createUser({ email: `o${n++}@example.com`, name: "Owner", password: "password123" });
  const family = createFamily("F", owner.id);
  const kid = addKid(family, owner.id, { name: "June", birthdate: "2021-03-14" });
  const col = (title: string) => createCollection(kid, owner.id, { title, school: "Little Oaks", teacher: "Ms. Rivera", grade: null, schoolYear: "2026–2027", description: null });
  const fall = col("Fall");
  const spring = col("Spring");
  const img = await processImage(await sharp({ create: { width: 300, height: 400, channels: 3, background: "#f97316" } }).jpeg().toBuffer());
  const add = (c: number, date: string) => addArt(kid, owner.id, img, { collectionId: c, originalName: null, madeOn: date });
  const art = [add(fall, "2026-09-10"), add(fall, "2026-10-01"), add(fall, "2026-10-20"), add(spring, "2027-03-01")];
  return { owner, kid, fall, spring, art };
}

beforeEach(() => setDatabase(openDatabase(":memory:")));

describe("books", () => {
  it("collects art oldest first, in collection order, without left-out pieces", async () => {
    const s = await setup();
    const id = createBook(s.kid, s.owner.id, settings(), [s.spring, s.fall]);
    let { book } = getBook(id, s.owner.id)!;
    // New books start with the oldest collection first.
    expect(bookSections(book).map((x) => x.collection.title)).toEqual(["Fall", "Spring"]);
    moveBookCollection(id, s.owner.id, s.fall, 1);
    // Saving settings keeps the order the person chose.
    updateBook(id, s.owner.id, settings(), [s.fall, s.spring]);
    book = getBook(id, s.owner.id)!.book;
    expect(bookSections(book).map((x) => x.collection.title)).toEqual(["Spring", "Fall"]);
    moveBookCollection(id, s.owner.id, s.fall, -1);
    setArtIncluded(id, s.owner.id, s.art[1], false);
    book = getBook(id, s.owner.id)!.book;
    expect(bookArt(book).map((a) => a.id)).toEqual([s.art[0], s.art[2], s.art[3]]);
  });

  it("plans pages per layout and pads to an even count", async () => {
    const s = await setup();
    const one = getBook(createBook(s.kid, s.owner.id, settings(), [s.fall, s.spring]), s.owner.id)!.book;
    const plan = planBook(one, bookSections(one), "2021-03-14");
    // cover, Fall title + 3 pages, Spring title + 1 page = 7, padded to 8
    expect(plan.pages.map((p) => p.kind)).toEqual(["cover", "section", "art", "art", "art", "section", "art", "blank"]);
    expect(planBook(one, bookSections(one), null, true).pages).toHaveLength(20);

    const four = getBook(createBook(s.kid, s.owner.id, settings({ layout: "four", dedication: "For Grandma" }), [s.fall]), s.owner.id)!.book;
    const p4 = planBook(four, bookSections(four), "2021-03-14");
    expect(p4.pages.map((p) => p.kind)).toEqual(["cover", "dedication", "section", "art"]);
    const art = p4.pages[3];
    expect(art.kind === "art" && art.slots.map((x) => x.caption.meta)).toEqual([
      "September 10, 2026 · 5 years old",
      "October 1, 2026 · 5 years old",
      "October 20, 2026 · 5 years old",
    ]);
  });

  it("renders a print-ready PDF with bleed", async () => {
    const s = await setup();
    updateArt(s.art[0], s.owner.id, { title: "Rainbow house 🌈", note: "It's our house when the sun comes out", madeOn: "2026-09-10", collectionId: s.fall });
    const book = getBook(createBook(s.kid, s.owner.id, settings({ layout: "two" }), [s.fall, s.spring]), s.owner.id)!.book;
    const plan = planBook(book, bookSections(book), "2021-03-14");
    const bytes = await renderBookPdf(plan, { kidName: "June", color: "#f97316", coverArt: bookArt(book)[0], title: book.title });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(plan.pages.length);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 8.25 * 72, height: 8.25 * 72 });
  });

  it("exports a numbered photo pack with captions", async () => {
    const s = await setup();
    const book = getBook(createBook(s.kid, s.owner.id, settings(), [s.fall]), s.owner.id)!.book;
    const files = unzipSync(await photoPack(book, "2021-03-14"));
    expect(Object.keys(files).sort()).toEqual(["001 - Fall.jpg", "002 - Fall.jpg", "003 - Fall.jpg", "captions.txt"]);
    expect(new TextDecoder().decode(files["captions.txt"])).toContain("September 10, 2026 · 5 years old");
  });
});
