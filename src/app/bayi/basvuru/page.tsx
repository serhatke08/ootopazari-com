import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import { fetchCities } from "@/lib/listings-data";
import { BayiApplicationForm } from "@/components/BayiApplicationForm";
import {
  DEALER_TYPES,
  DEALER_TYPE_LABELS,
  type DealerType,
} from "@/lib/bayi-types";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Bayi Başvurusu",
  description: "Oto Pazarı'nda bayi olun ve işinizi büyütün",
  robots: { index: false, follow: false },
};

export default async function BayiBasvuruPage({ searchParams }: Props) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const sp = await searchParams;
    const typeParam = Array.isArray(sp.type) ? sp.type[0] : sp.type;
    const returnUrl = typeParam
      ? `/bayi/basvuru?type=${typeParam}`
      : "/bayi/basvuru";
    redirect(`/giris?next=${encodeURIComponent(returnUrl)}`);
  }

  const sp = await searchParams;
  const typeParam = Array.isArray(sp.type) ? sp.type[0] : sp.type;

  if (!typeParam || !DEALER_TYPES.includes(typeParam as DealerType)) {
    // Type seçim ekranı
    return (
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900">
            Bayi Başvurusu
          </h1>
          <p className="mt-2 text-zinc-600">
            Başvuru yapmak istediğiniz bayi tipini seçin
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {DEALER_TYPES.map((type) => (
            <a
              key={type}
              href={`/bayi/basvuru?type=${type}`}
              className="group rounded-xl border-2 border-zinc-200 bg-white p-6 transition hover:border-[#ffc400] hover:shadow-lg"
            >
              <h2 className="text-xl font-bold text-zinc-900 group-hover:text-[#ffc400]">
                {DEALER_TYPE_LABELS[type]}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                {type === "galeri" && "Araç galerisi - ikinci el araç satışı"}
                {type === "parcaci" && "Yedek parça satışı ve hizmetleri"}
                {type === "kiralama" && "Araç kiralama hizmeti"}
                {type === "expertiz" && "Araç ekspertiz hizmeti"}
              </p>
              <div className="mt-4 flex items-center justify-end text-sm font-semibold text-[#ffc400]">
                Başvur →
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  const dealerType = typeParam as DealerType;
  const cities = (await fetchCities(supabase))
    .filter((city) => city.name != null)
    .map((city) => ({
      id: String(city.id),
      name: String(city.name),
    }));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
      <BayiApplicationForm dealerType={dealerType} cities={cities} />
    </div>
  );
}
