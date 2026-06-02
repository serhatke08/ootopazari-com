import { ImageResponse } from "next/og";

export const alt = "Oto Pazarı — İkinci el ve sıfır araç ilanları";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #05090c 0%, #1a1a1a 50%, #05090c 100%)",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "#ffcc00",
            marginBottom: 32,
            fontSize: 48,
            fontWeight: 800,
            color: "#05090c",
          }}
        >
          OP
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: -2,
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          Oto Pazarı
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 32,
            color: "#ffc400",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          İkinci El ve Sıfır Araç İlanları
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 22,
            color: "rgba(255,255,255,0.75)",
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Türkiye genelinde otomobil ilanları · Ücretsiz ilan ver
        </div>
      </div>
    ),
    { ...size }
  );
}
