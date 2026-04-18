import type { CategoryRow } from "@/lib/listings-data";

/** Arayüzde sabit sıra: Otomobil → SUV → Motosiklet */
const SLOT_DEFS: {
  label: string;
  match: (c: CategoryRow) => boolean;
}[] = [
  {
    label: "Otomobil",
    match: (c) => {
      const n = (c.name ?? "").toLowerCase();
      const code = (c.code ?? "").toLowerCase();
      return (
        n.includes("otomobil") ||
        code === "otomobil" ||
        code === "binek" ||
        code === "car"
      );
    },
  },
  {
    label: "SUV",
    match: (c) => {
      const n = (c.name ?? "").toLowerCase();
      const code = (c.code ?? "").toLowerCase();
      return n.includes("suv") || code === "suv" || n === "suv";
    },
  },
  {
    label: "Motosiklet",
    match: (c) => {
      const n = (c.name ?? "").toLowerCase();
      const code = (c.code ?? "").toLowerCase();
      return (
        n.includes("motosiklet") ||
        n.includes("motor bisiklet") ||
        code === "motosiklet" ||
        code === "moto" ||
        code === "motorcycle"
      );
    },
  },
];

/**
 * DB’deki kategorileri üç slota dağıtır (her kategori en fazla bir slotta).
 * Eşleşme yoksa boş döner; çağıran tarafta tüm liste fallback’i kullanılır.
 */
export function pickVehicleCategorySlots(
  categories: CategoryRow[]
): { id: string; label: string }[] {
  const used = new Set<string>();
  const out: { id: string; label: string }[] = [];

  for (const def of SLOT_DEFS) {
    const found = categories.find((c) => !used.has(c.id) && def.match(c));
    if (found) {
      used.add(found.id);
      out.push({ id: found.id, label: def.label });
    }
  }

  return out;
}

/** Seçilen kategori motosiklet mi (sol menüde motor logoları için). */
export function categoryIdIsMotorcycle(
  categoryId: string,
  categories: CategoryRow[]
): boolean {
  if (!categoryId) return false;
  const slots = pickVehicleCategorySlots(categories);
  const moto = slots.find((s) => s.label === "Motosiklet");
  if (moto && moto.id === categoryId) return true;
  const c = categories.find((x) => x.id === categoryId);
  if (!c) return false;
  const n = (c.name ?? "").toLowerCase();
  const code = (c.code ?? "").toLowerCase();
  return (
    n.includes("motosiklet") ||
    n.includes("motor bisiklet") ||
    code === "motosiklet" ||
    code === "moto" ||
    code === "motorcycle"
  );
}
