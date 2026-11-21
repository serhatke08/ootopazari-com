export type DealerMapAddress = {
  line: string;
  city: string;
};

function foldAddr(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .replace(/\bmahallesi\b/g, "mah")
    .replace(/\bmah\.?/g, "mah")
    .replace(/[.,]/g, "")
    .trim();
}

function sameAddr(a: string, b: string): boolean {
  const fa = foldAddr(a);
  const fb = foldAddr(b);
  if (!fa || !fb) return false;
  return fa === fb;
}

function stripCityFromPart(piece: string, city: string): string {
  const p = piece.trim();
  if (!city) return p;
  if (sameAddr(p, city)) return "";
  const slash = p.split("/");
  if (slash.length === 2 && sameAddr(slash[1] ?? "", city)) {
    return slash[0]?.trim() ?? "";
  }
  return p;
}

/** Kayıtta biriken mahalle/ilçe tekrarını atar; şehri ayrı tutar. */
export function formatDealerMapAddress(
  fullAddress?: string | null,
  cityName?: string | null
): DealerMapAddress {
  const city = (cityName ?? "").trim();
  const seen: string[] = [];
  const parts: string[] = [];

  for (const chunk of (fullAddress ?? "").split(/[,·|]/)) {
    const piece = stripCityFromPart(chunk, city);
    if (!piece) continue;
    const folded = foldAddr(piece);
    if (!folded) continue;
    if (seen.includes(folded)) continue;
    seen.push(folded);
    parts.push(piece);
  }

  return { line: parts.join(", "), city };
}
