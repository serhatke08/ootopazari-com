"use client";

export function BayiDealerSortSelect({
  defaultValue,
}: {
  defaultValue: string;
}) {
  return (
    <select
      name="dealer_sort"
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-medium"
    >
      <option value="newest">En yeni</option>
      <option value="name_asc">İsim (A-Z)</option>
      <option value="name_desc">İsim (Z-A)</option>
    </select>
  );
}
