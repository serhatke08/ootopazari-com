import type { ListingSpecRow } from "@/lib/listing-vehicle-display";

type Props = {
  rows: ListingSpecRow[];
};

export function ListingVehicleSpecs({ rows }: Props) {
  const visible = rows.filter((r) => r.label.trim() !== "");
  if (visible.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-black/55">Araç bilgisi girilmemiş.</p>
    );
  }

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2">
      {visible.map((row) => (
        <div
          key={row.label}
          className="border-b border-black/8 px-4 py-3.5 sm:odd:border-r sm:odd:border-black/8"
        >
          <dt className="text-xs font-medium text-black/50">{row.label}</dt>
          <dd className="mt-1 text-[15px] font-semibold leading-snug text-black">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
