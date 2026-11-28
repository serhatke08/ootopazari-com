import { NextResponse } from "next/server";

export const dynamic = "force-static";

/** iOS Universal Links (e-Devlet dönüşü + ilan). */
const BODY = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appID: "549DLY8TB7.com.partridge.otomobile",
        paths: [
          "/app/eids",
          "/app/eids/*",
          "/ilan/*",
          "/sifre-sifirla",
          "/sifre-sifirla/*",
        ],
        components: [
          { "/": "/app/eids" },
          { "/": "/app/eids/*" },
          { "/": "/ilan/*" },
          { "/": "/sifre-sifirla" },
          { "/": "/sifre-sifirla/*" },
        ],
      },
    ],
  },
};

export async function GET() {
  return new NextResponse(JSON.stringify(BODY), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600",
    },
  });
}
