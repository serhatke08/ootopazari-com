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
      <p className="px-4 py-6 text-sm text-black/55">Araç bilgisi girilmemiş.</p>
    );
  }

  return (
    <table className="w-full table-fixed border-collapse text-left">
      <tbody>
        {visible.map((row) => (
          <tr key={row.label} className="border-b border-black/8 last:border-b-0">
            <th
              scope="row"
              className="w-[38%] bg-zinc-50 px-3 py-2.5 align-top text-[13px] font-semibold leading-snug text-black/55 sm:w-[32%] sm:px-4"
            >
              {row.label}
            </th>
            <td className="px-3 py-2.5 align-top text-[14px] font-semibold leading-snug text-black sm:px-4">
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
