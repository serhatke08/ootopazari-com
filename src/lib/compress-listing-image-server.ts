import sharp from "sharp";

const MAX_WIDTH = 1080;
const JPEG_QUALITY = 80;

export type CompressedImage = {
  buffer: Buffer;
  contentType: "image/jpeg";
  ext: "jpg";
};

/** Storage’a yazmadan önce: max 1080px genişlik, JPEG %80. Image Transform yok. */
export async function compressListingImageBuffer(
  input: Buffer
): Promise<CompressedImage> {
  const buffer = await sharp(input)
    .rotate()
    .resize({
      width: MAX_WIDTH,
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { buffer, contentType: "image/jpeg", ext: "jpg" };
}
