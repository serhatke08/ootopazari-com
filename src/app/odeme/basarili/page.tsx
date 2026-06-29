import Link from "next/link";
import { FeatureBoostSuccessActivator } from "@/components/FeatureBoostSuccessActivator";
import { BayiMembershipSuccessActivator } from "@/components/BayiMembershipSuccessActivator";
import { DEALER_TYPE_LABELS, type DealerType } from "@/lib/bayi-types";

type Props = {
  searchParams: Promise<{ type?: string; oid?: string; dealerType?: string }>;
};

export default async function OdemeBasariliPage({ searchParams }: Props) {
  const { type, oid, dealerType } = await searchParams;
  const isFeatureBoost = type === "feature_boost";
  const isBayiMembership = type === "bayi_membership";
  const merchantOid = oid?.trim() || null;
  const dealerLabel =
    dealerType && dealerType in DEALER_TYPE_LABELS
      ? DEALER_TYPE_LABELS[dealerType as DealerType]
      : null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 text-center sm:px-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8">
        <p className="text-2xl font-black text-emerald-950">Ödeme alındı</p>
        {isFeatureBoost ? (
          <FeatureBoostSuccessActivator merchantOid={merchantOid} />
        ) : isBayiMembership ? (
          <BayiMembershipSuccessActivator merchantOid={merchantOid} />
        ) : (
          <p className="mt-3 text-sm leading-6 text-emerald-900">
            Ödemeniz başarıyla tamamlandı.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/profil/odemeler"
            className="rounded-lg bg-[#ffc400] px-4 py-2 text-sm font-black text-black hover:bg-[#ffd24d]"
          >
            Ödeme geçmişi
          </Link>
          {isBayiMembership && dealerType ? (
            <Link
              href={`/bayi/panel/${dealerType}`}
              className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/50"
            >
              {dealerLabel ?? "Bayi"} paneli
            </Link>
          ) : (
            <Link
              href="/profil/ilanlarim"
              className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/50"
            >
              İlanlarım
            </Link>
          )}
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
