import { NextResponse } from "next/server";
import { resolveRequestUser } from "@/lib/supabase/request-user";
import { compressListingImageBuffer } from "@/lib/compress-listing-image-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

/** İlan görselini Flutter’ın bozmadığı JPEG’e çevir (ICC yok, sRGB, 1080px). */
export async function POST(req: Request) {
  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(typeof File !== "undefined" && file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
  }

  try {
    const raw = Buffer.from(await file.arrayBuffer());
    const compressed = await compressListingImageBuffer(raw);
    return new NextResponse(new Uint8Array(compressed.buffer), {
      status: 200,
      headers: {
        "Content-Type": compressed.contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "compress_failed" }, { status: 500 });
  }
}
