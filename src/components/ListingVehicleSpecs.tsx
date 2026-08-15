import type { ListingSpecRow } from "@/lib/listing-vehicle-display";

type Props = {
  rows: ListingSpecRow[];
};

export function ListingVehicleSpecs({ rows }: Props) {
  const visible = rows.filter(
    (r) => r.label.trim() !== "" && r.value.trim() !== "" && r.value !== "—"
  );
  if (visible.length === 0) {
    return (
      <p className="px-2 py-3 text-[11px] text-black/55">
        Araç bilgisi girilmemiş.
      </p>
    );
  }

  return (
    <dl className="divide-y divide-black/8">
      {visible.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[36%_1fr] sm:grid-cols-[30%_1fr]"
        >
          <dt className="bg-zinc-50 px-2 py-1 text-[10px] font-medium leading-snug text-black/50">
            {row.label}
          </dt>
          <dd className="px-2 py-1 text-[11px] font-medium leading-snug text-black">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
