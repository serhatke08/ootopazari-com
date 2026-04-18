import Image from "next/image";
import type { ExpertizDurum } from "@/lib/expertiz";
import {
  PANEL_LABELS,
  SABLON_FILENAME,
  durumEtiket,
  expertizAssetUrl,
  expertizOverlayFileName,
  type PanelKey,
} from "@/lib/expertiz";

function collectExpertizOverlayUrls(
  panels: Record<string, ExpertizDurum>
): string[] {
  const entries = Object.entries(panels) as [PanelKey, ExpertizDurum][];
  const overlayUrls: string[] = [];
  for (const [key, durum] of entries) {
    const fn = expertizOverlayFileName(key, durum);
    if (fn) overlayUrls.push(expertizAssetUrl(fn));
  }
  return overlayUrls;
}

/** Şablon + parça katmanları; ilan verme önizlemesi için kompakt. */
export function ExpertizCarPreview({
  panels,
  className = "",
}: {
  panels: Record<PanelKey, ExpertizDurum>;
  className?: string;
}) {
  const overlayUrls = collectExpertizOverlayUrls(panels);
  const sablonSrc = expertizAssetUrl(SABLON_FILENAME);

  return (
    <div
      className={`relative mx-auto aspect-square w-full max-w-sm bg-white ${className}`.trim()}
    >
      <Image
        src={sablonSrc}
        alt="Ekspertiz şablonu"
        fill
        className="object-contain"
        sizes="400px"
        priority={false}
      />
      {overlayUrls.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element -- üst üste tam tuval PNG
        <img
          key={src}
          src={src}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      ))}
    </div>
  );
}

export function ExpertizDiagram({
  panels,
}: {
  panels: Record<string, ExpertizDurum>;
}) {
  const entries = Object.entries(panels) as [PanelKey, ExpertizDurum][];
  const sorted = [...entries].sort(([a], [b]) =>
    (PANEL_LABELS[a] ?? a).localeCompare(PANEL_LABELS[b] ?? b, "tr")
  );

  const legend = [
    {
      tr: "Değişen",
      hex: "#FF3131",
      border: "border border-black/20",
    },
    {
      tr: "Boyalı",
      hex: "#5170FF",
      border: "border border-black/20",
    },
    {
      tr: "Lokal boyalı",
      hex: "#FF751F",
      border: "border border-black/20",
    },
    {
      tr: "Orijinal",
      hex: "#D9D9D9",
      border: "border border-zinc-400",
    },
  ] as const;

  return (
    <div className="space-y-4 text-black">
      <div className="mx-auto w-full max-w-[500px] rounded border border-black/10 bg-white p-2 shadow-sm">
        <ExpertizCarPreview
          panels={Object.fromEntries(entries) as Record<PanelKey, ExpertizDurum>}
        />
      </div>

      <div
        className="mx-auto w-full max-w-[500px] rounded border border-black/10 bg-white p-3"
        aria-label="Ekspertiz renk lejantı"
      >
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-black/60">
          Lejant
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {legend.map((item) => (
            <div
              key={item.tr}
              className="flex items-center gap-2 rounded-md border border-black/10 bg-white px-2 py-1.5"
            >
              <span
                className={`h-5 w-5 shrink-0 rounded-sm shadow-inner ${item.border}`}
                style={{ backgroundColor: item.hex }}
                aria-hidden
              />
              <span className="text-[11px] font-semibold leading-tight text-black">
                {item.tr}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-black/10 bg-white">
        <table className="w-full min-w-[280px] text-left text-sm text-black">
          <thead>
            <tr className="border-b border-black/10 bg-white">
              <th className="px-3 py-2 font-semibold">Parça</th>
              <th className="px-3 py-2 font-semibold">Durum</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(([key, durum]) => (
              <tr key={key} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-2">{PANEL_LABELS[key] ?? key}</td>
                <td className="px-3 py-2">{durumEtiket(durum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
