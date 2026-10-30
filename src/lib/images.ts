import fs from "node:fs";
import path from "node:path";
import sharp, { type Metadata } from "sharp";
import { DATA_DIR } from "./db";

export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

export const SIZES = {
  thumb: 640, // gallery grid
  display: 2000, // full-screen view
} as const;
export type Size = keyof typeof SIZES | "original";

export class ImageError extends Error {}

export type ProcessedImage = {
  ext: string;
  width: number;
  height: number;
  original: Buffer;
  thumb: Buffer;
  display: Buffer;
};

const EXT_BY_FORMAT: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  tiff: "tif",
  gif: "gif",
  heif: "heic",
  avif: "avif",
};

/**
 * Reads an uploaded photo or scan and makes the smaller copies the gallery
 * shows. Phone photos are turned upright using their orientation data.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageError("That file is too big. The limit is 40 MB.");
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new ImageError("That file isn’t an image we can read. Try a JPEG or PNG.");
  }
  const ext = meta.format ? EXT_BY_FORMAT[meta.format] : undefined;
  if (!ext) throw new ImageError("That file isn’t an image we can read. Try a JPEG or PNG.");

  const resize = (max: number) =>
    sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

  try {
    const [thumb, display] = await Promise.all([resize(SIZES.thumb), resize(SIZES.display)]);
    // Use the upright size of the full original, not the resized copy.
    const sideways = (meta.orientation ?? 1) >= 5;
    return {
      ext,
      width: (sideways ? meta.height : meta.width) ?? display.info.width,
      height: (sideways ? meta.width : meta.height) ?? display.info.height,
      original: input,
      thumb: thumb.data,
      display: display.data,
    };
  } catch {
    if (meta.format === "heif") {
      throw new ImageError(
        "iPhone HEIC photos can’t be read yet. Upload from Safari, which converts them, or set the camera to Most Compatible.",
      );
    }
    throw new ImageError("Something went wrong reading that image. Try saving it as a JPEG.");
  }
}

export function kidArtDir(kidId: number): string {
  return path.join(DATA_DIR, "art", String(kidId));
}

export function artFile(kidId: number, artId: number, size: Size, ext: string): string {
  const name = size === "original" ? `${artId}-original.${ext}` : `${artId}-${size}.webp`;
  return path.join(kidArtDir(kidId), name);
}

export function writeArtFiles(kidId: number, artId: number, image: ProcessedImage) {
  fs.mkdirSync(kidArtDir(kidId), { recursive: true });
  fs.writeFileSync(artFile(kidId, artId, "original", image.ext), image.original);
  fs.writeFileSync(artFile(kidId, artId, "thumb", image.ext), image.thumb);
  fs.writeFileSync(artFile(kidId, artId, "display", image.ext), image.display);
}

export function deleteArtFiles(kidId: number, artId: number, ext: string) {
  for (const size of ["original", "thumb", "display"] as const) {
    fs.rmSync(artFile(kidId, artId, size, ext), { force: true });
  }
}

export function deleteKidArt(kidId: number) {
  fs.rmSync(kidArtDir(kidId), { recursive: true, force: true });
}

export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  tif: "image/tiff",
  gif: "image/gif",
  heic: "image/heic",
  avif: "image/avif",
};
