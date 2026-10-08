const MAX_WIDTH = 1080;
const JPEG_QUALITY = 0.8;

/** Mobil ile uyumlu: genişlik ≤1080px, JPEG %80. Başarısız olursa orijinal dosya döner. */
export async function compressListingImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  if (typeof createImageBitmap !== "function") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width <= MAX_WIDTH && file.size < 450_000 && file.type === "image/jpeg") {
      bitmap.close();
      return file;
    }

    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
    });
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export async function compressListingImageFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressListingImageFile(f)));
}
