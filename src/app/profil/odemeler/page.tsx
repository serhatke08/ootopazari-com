import type { Metadata } from "next";
import {
  PaymentHistoryList,
  PaymentServiceSummaryList,
} from "@/components/PaymentHistoryList";
import {
  fetchUserPaymentHistory,
  fetchUserPaymentServiceSummaries,
} from "@/lib/payment-history";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Ödeme Geçmişi",
  robots: { index: false, follow: false },
};

export default async function ProfilOdemelerPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [entries, summaries] = await Promise.all([
    fetchUserPaymentHistory(supabase, user.id, 80),
    fetchUserPaymentServiceSummaries(supabase, user.id),
  ]);

  return (
    <div className="mx-auto mt-8 w-full max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Ödeme geçmişi</h2>
        <p className="mt-1 text-sm text-zinc-600">
          İlan öne çıkarma paketleri, bayi abonelik ödemeleri ve kalan süreler.
        </p>
      </div>
      <PaymentServiceSummaryList summaries={summaries} />
      <PaymentHistoryList entries={entries} />
    </div>
  );
}
