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
