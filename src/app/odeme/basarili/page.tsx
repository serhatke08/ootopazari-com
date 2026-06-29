import Link from "next/link";
import { FeatureBoostSuccessActivator } from "@/components/FeatureBoostSuccessActivator";

type Props = {
  searchParams: Promise<{ type?: string; oid?: string }>;
};

export default async function OdemeBasariliPage({ searchParams }: Props) {
  const { type, oid } = await searchParams;
  const isFeatureBoost = type === "feature_boost";
  const merchantOid = oid?.trim() || null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 text-center sm:px-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8">
        <p className="text-2xl font-black text-emerald-950">Ödeme alındı</p>
        {isFeatureBoost ? (
          <FeatureBoostSuccessActivator merchantOid={merchantOid} />
        ) : (
          <p className="mt-3 text-sm leading-6 text-emerald-900">
            Ödemeniz başarıyla tamamlandı.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/profil/ilanlarim"
            className="rounded-lg bg-[#ffc400] px-4 py-2 text-sm font-black text-black hover:bg-[#ffd24d]"
          >
            İlanlarım
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/50"
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
