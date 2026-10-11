const MAX_WIDTH = 1080;
const JPEG_QUALITY = 0.8;

function asJpegFile(blob: Blob, originalName: string): File {
  const base = originalName.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/** Sharp (sunucu): ICC’siz sRGB JPEG — Flutter decode bozulmasın. */
async function compressListingImageViaApi(file: File): Promise<File | null> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/listing-images/prepare", {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size <= 0) return null;
    return asJpegFile(blob, file.name);
  } catch {
    return null;
  }
}

async function compressListingImageFileCanvas(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  if (typeof createImageBitmap !== "function") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
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
    return asJpegFile(blob, file.name);
  } catch {
    return file;
  }
}

/** Mobil ile uyumlu: genişlik ≤1080px, JPEG %80. Önce Sharp, olmazsa canvas. */
export async function compressListingImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  const viaApi = await compressListingImageViaApi(file);
  if (viaApi) return viaApi;
  return compressListingImageFileCanvas(file);
}

export async function compressListingImageFiles(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    out.push(await compressListingImageFile(f));
  }
  return out;
}
