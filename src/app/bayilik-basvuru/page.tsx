import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { BayiApplicationForm } from "@/components/BayiApplicationForm";
import { fetchCities } from "@/lib/listings-data";
import { DEALER_TYPE_META, type DealerType } from "@/lib/dealer-types";

export const metadata: Metadata = {
  title: "Bayilik Başvurusu",
  robots: { index: false, follow: false },
};

type ApplicationRow = {
  id: string;
  dealer_type: DealerType | null;
  status: string | null;
  created_at: string | null;
};

function statusLabel(status: string | null): string {
  const s = String(status ?? "").toLocaleLowerCase("tr");
  if (s === "approved") return "Onaylandı";
  if (s === "rejected") return "Reddedildi";
  if (s === "pending") return "Beklemede";
  return "Bilinmiyor";
}

function statusClass(status: string | null): string {
  const s = String(status ?? "").toLocaleLowerCase("tr");
  if (s === "approved") return "bg-emerald-100 text-emerald-800";
  if (s === "rejected") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-900";
}

export default async function BayilikBasvuruPage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/giris?next=${encodeURIComponent("/bayilik-basvuru")}`);
  }

  const [{ data }, cities] = await Promise.all([
    supabase
      .from("bayi_applications")
      .select("id,dealer_type,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    fetchCities(supabase),
  ]);

  const rows = (data ?? []) as ApplicationRow[];

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
        Bayilik Başvurusu
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Bilgilerini doldurup belgelerini yükle. Başvurunun durumunu aşağıdaki
        listeden takip edebilirsin.
      </p>

      <div className="mt-5">
        <BayiApplicationForm cities={cities} />
      </div>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Son Başvuruların</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">Henüz başvurun yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((row) => {
              const type =
                row.dealer_type && row.dealer_type in DEALER_TYPE_META
                  ? DEALER_TYPE_META[row.dealer_type].label
                  : "Tür belirtilmemiş";
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{type}</p>
                    <p className="text-xs text-zinc-500">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString("tr-TR")
                        : "-"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                      row.status
                    )}`}
                  >
                    {statusLabel(row.status)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
