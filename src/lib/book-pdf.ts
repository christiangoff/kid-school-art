import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import type { BookPlan, Caption, Slot } from "./book-plan";
import { collectionDetails } from "./collection-details";
import { DATA_DIR } from "./db";
import type { Artwork } from "./gallery";
import { artFile } from "./images";

const PT = 72; // PDF points per inch
const DPI = 300;

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const INK = hexToRgb("#2b2118");
const MUTED = hexToRgb("#7a6a5c");
const PAPER = hexToRgb("#fffaf3");

/**
 * A JPEG of the piece sized for print at 300 dpi, made from the original and
 * cached, since a book reuses the same pieces every time it's downloaded.
 */
export async function printImage(art: Artwork, maxInches: number): Promise<Buffer> {
  const px = Math.min(Math.round(maxInches * DPI), 4800);
  const original = artFile(art.kidId, art.id, "original", art.originalExt);
  const cacheDir = path.join(DATA_DIR, "cache", "print");
  // Keyed by the original's modified time too, in case an id is reused after a delete.
  const cached = path.join(cacheDir, `${art.id}-${Math.round(fs.statSync(original).mtimeMs)}-${px}.jpg`);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);
  const data = await sharp(original, { failOn: "none" })
    .rotate()
    .resize({ width: px, height: px, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 88 })
    .toBuffer();
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cached, data);
  return data;
}

/** Drops characters the built-in PDF fonts can't draw, like emoji. */
function safe(font: PDFFont, text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      // Not in the font; leave it out.
    }
  }
  return out;
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of safe(font, text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };

/** Draws lines centered on x, top at y (points from the bottom). Returns the y below the text. */
function centered(page: PDFPage, lines: string[], font: PDFFont, size: number, x: number, y: number, color = INK): number {
  for (const line of lines) {
    y -= size * 1.25;
    page.drawText(line, { x: x - font.widthOfTextAtSize(line, size) / 2, y, size, font, color });
  }
  return y;
}

function captionLines(c: Caption, fonts: Fonts, size: number, width: number) {
  const out: { lines: string[]; font: PDFFont; size: number; color: typeof INK }[] = [];
  if (c.title) out.push({ lines: wrap(fonts.bold, c.title, size * 1.1, width).slice(0, 2), font: fonts.bold, size: size * 1.1, color: INK });
  if (c.note) out.push({ lines: wrap(fonts.italic, `“${c.note}”`, size, width).slice(0, 4), font: fonts.italic, size, color: INK });
  if (c.meta) out.push({ lines: wrap(fonts.regular, c.meta, size * 0.85, width).slice(0, 1), font: fonts.regular, size: size * 0.85, color: MUTED });
  const height = out.reduce((h, b) => h + b.lines.length * b.size * 1.25, 0) + (out.length ? 8 : 0);
  return { blocks: out, height };
}

async function drawSlot(doc: PDFDocument, page: PDFPage, slot: Slot, fonts: Fonts, plan: BookPlan, captionSize: number) {
  const off = plan.bleed;
  const x = (slot.x + off) * PT;
  const w = slot.w * PT;
  const top = (plan.height + off - slot.y) * PT;
  const h = slot.h * PT;
  const { blocks, height } = captionLines(slot.caption, fonts, captionSize, w);
  const img = await doc.embedJpg(await printImage(slot.art, Math.max(slot.w, slot.h)));
  // Fit the piece above its caption, then center the two together in the slot.
  const scale = Math.min(w / img.width, (h - height) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const imageTop = top - (h - dh - height) / 2;
  page.drawImage(img, { x: x + (w - dw) / 2, y: imageTop - dh, width: dw, height: dh });
  let y = imageTop - dh - 8;
  for (const b of blocks) y = centered(page, b.lines, b.font, b.size, x + w / 2, y, b.color);
}

/** Renders a planned book to a print-ready PDF. Page size includes bleed when the plan has it. */
export async function renderBookPdf(plan: BookPlan, opts: { kidName: string; color: string; coverArt: Artwork | null; title: string }) {
  const doc = await PDFDocument.create();
  doc.setTitle(opts.title);
  doc.setCreator("Kid School Art");
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
  const pw = (plan.width + plan.bleed * 2) * PT;
  const ph = (plan.height + plan.bleed * 2) * PT;
  const cx = pw / 2;
  const scale = Math.min(plan.width, plan.height) / 8; // type grows with the page
  const accent = hexToRgb(opts.color);

  for (const p of plan.pages) {
    const page = doc.addPage([pw, ph]);
    if (p.kind === "cover") {
      page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: accent });
      const textW = (plan.width - 1.5) * PT;
      let y = ph - (plan.bleed + 0.9) * PT;
      y = centered(page, wrap(fonts.bold, p.title, 34 * scale, textW), fonts.bold, 34 * scale, cx, y, rgb(1, 1, 1));
      if (p.subtitle) y = centered(page, wrap(fonts.regular, p.subtitle, 16 * scale, textW), fonts.regular, 16 * scale, cx, y - 4, rgb(1, 1, 1));
      if (opts.coverArt) {
        const box = { w: (plan.width - 1.6) * PT, h: y - (plan.bleed + 0.8) * PT - 16 };
        const img = await doc.embedJpg(await printImage(opts.coverArt, Math.max(box.w, box.h) / PT));
        const s = Math.min(box.w / img.width, box.h / img.height);
        const dw = img.width * s;
        const dh = img.height * s;
        const ix = cx - dw / 2;
        const iy = (plan.bleed + 0.8) * PT + (box.h - dh) / 2;
        // A white mat around the art, like a frame.
        page.drawRectangle({ x: ix - 10, y: iy - 10, width: dw + 20, height: dh + 20, color: rgb(1, 1, 1) });
        page.drawImage(img, { x: ix, y: iy, width: dw, height: dh });
      }
    } else if (p.kind === "dedication") {
      page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: PAPER });
      const lines = wrap(fonts.italic, p.text, 16 * scale, (plan.width - 2) * PT);
      centered(page, lines, fonts.italic, 16 * scale, cx, ph / 2 + (lines.length * 16 * scale * 1.25) / 2);
    } else if (p.kind === "section") {
      page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: PAPER });
      page.drawRectangle({ x: cx - 30 * scale, y: ph / 2 + 50 * scale, width: 60 * scale, height: 5 * scale, color: accent });
      let y = ph / 2 + 30 * scale;
      y = centered(page, wrap(fonts.bold, p.collection.title, 28 * scale, (plan.width - 1.5) * PT), fonts.bold, 28 * scale, cx, y);
      const details = collectionDetails(p.collection);
      if (details) y = centered(page, wrap(fonts.regular, details, 13 * scale, (plan.width - 1.5) * PT), fonts.regular, 13 * scale, cx, y - 6, MUTED);
      if (p.collection.description) {
        centered(page, wrap(fonts.italic, p.collection.description, 12 * scale, (plan.width - 2) * PT).slice(0, 6), fonts.italic, 12 * scale, cx, y - 14);
      }
    } else if (p.kind === "art") {
      const captionSize = (p.slots.length > 2 ? 9 : 11) * scale;
      for (const slot of p.slots) await drawSlot(doc, page, slot, fonts, plan, captionSize);
    }
  }
  return doc.save();
}
