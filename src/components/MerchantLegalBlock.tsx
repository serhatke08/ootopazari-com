import type { MerchantLegalInfo } from "@/lib/merchant-legal";

type Props = {
  info: MerchantLegalInfo;
  compact?: boolean;
};

export function MerchantLegalBlock({ info, compact = false }: Props) {
  const rows: { label: string; value: string }[] = [
    { label: "Ticari unvan", value: info.legalName },
    ...(info.address
      ? [{ label: "Adres", value: info.address }]
      : []),
    { label: "E-posta", value: info.email },
    ...(info.phone ? [{ label: "Telefon", value: info.phone }] : []),
    ...(info.taxOffice && info.taxNumber
      ? [
          {
            label: "Vergi dairesi / No",
            value: `${info.taxOffice} — ${info.taxNumber}`,
          },
        ]
      : info.taxNumber
        ? [{ label: "Vergi no", value: info.taxNumber }]
        : []),
    ...(info.mersis ? [{ label: "MERSİS", value: info.mersis }] : []),
  ];

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-zinc-50 ${
        compact ? "p-3" : "p-4 sm:p-5"
      }`}
    >
      <p className="text-sm font-bold text-zinc-950">Satıcı bilgileri</p>
      <dl className={`mt-3 space-y-2.5 ${compact ? "text-xs" : "text-sm"}`}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="font-medium text-zinc-500">{row.label}</dt>
            <dd className="mt-0.5 font-medium leading-relaxed text-zinc-800">
              {row.label === "E-posta" ? (
                <a href={`mailto:${row.value}`} className="underline">
                  {row.value}
                </a>
              ) : row.label === "Telefon" ? (
                <a href={`tel:${row.value.replace(/\s/g, "")}`}>{row.value}</a>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
