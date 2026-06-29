/** Açıklama metninden `Etiket: değer` satırı (çok satırlı). */
export function parseDescriptionSpecLine(
  text: string,
  label: string
): string | undefined {
  if (!text.trim()) return undefined;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}\\s*:\\s*(.+)$`, "im");
  const match = text.match(re);
  const value = match?.[1]?.trim();
  return value || undefined;
}

export type DescriptionVehicleSpecs = {
  seriModel?: string;
  motor?: string;
  paket?: string;
  kasa?: string;
};

export function parseDescriptionVehicleSpecs(
  description: string
): DescriptionVehicleSpecs {
  return {
    seriModel: parseDescriptionSpecLine(description, "Seri/Model"),
    motor: parseDescriptionSpecLine(description, "Motor"),
    paket: parseDescriptionSpecLine(description, "Paket"),
    kasa: parseDescriptionSpecLine(description, "Kasa Tipi"),
  };
}

/** İlan detayında Model satırı: motor + paket birleşimi. */
export function joinMotorPaket(
  motor: string | null | undefined,
  paket: string | null | undefined
): string | undefined {
  const parts = [motor?.trim(), paket?.trim()].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** `vehicle_model` metninden seri önekini çıkarır (kalan motor/paket olabilir). */
export function vehicleModelTailAfterSeri(
  vehicleModel: string | null | undefined,
  seri: string | null | undefined
): string | undefined {
  const vm =
    vehicleModel != null && String(vehicleModel).trim() !== ""
      ? String(vehicleModel).trim()
      : "";
  const s = seri?.trim() ?? "";
  if (!vm) return undefined;
  if (!s || vm.toLowerCase() === s.toLowerCase()) return undefined;

  const vmLower = vm.toLowerCase();
  const seriLower = s.toLowerCase();
  if (vmLower.startsWith(seriLower)) {
    const tail = vm.slice(s.length).trim().replace(/^[-·/]\s*/, "");
    return tail || undefined;
  }
  return vm;
}

export function resolveListingModelDisplay(opts: {
  trimModel?: string | null;
  motor?: string | null;
  paket?: string | null;
  vehicleModel?: string | null;
  seri?: string | null;
}): string | undefined {
  const trim = opts.trimModel?.trim();
  if (trim) return trim;

  const motorPaket = joinMotorPaket(opts.motor, opts.paket);
  if (motorPaket) return motorPaket;

  return vehicleModelTailAfterSeri(opts.vehicleModel, opts.seri);
}

export type ListingSpecRow = {
  label: string;
  value: string;
};

export function specValue(
  value: string | number | boolean | null | undefined,
  fallback = "—"
): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  return String(value);
}
