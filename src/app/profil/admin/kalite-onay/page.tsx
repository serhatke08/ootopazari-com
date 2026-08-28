import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminQualityResubmitTable } from "@/components/admin/AdminQualityResubmitTable";
import { requireAdminSessionClient } from "@/lib/admin-api";
import { fetchAdminQualityResubmitPending } from "@/lib/admin-quality-resubmit";

export const metadata: Metadata = {
  title: "Admin — Kalite onayı",
  robots: { index: false, follow: false },
};

export default async function AdminKaliteOnayPage() {
  const ctx = await requireAdminSessionClient();
  if (!ctx.ok) {
    if (ctx.status === 401) {
      redirect(`/giris?next=${encodeURIComponent("/profil/admin/kalite-onay")}`);
    }
    redirect("/profil");
  }

  const rows = await fetchAdminQualityResubmitPending(ctx.supabase);

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold tracking-tight text-zinc-900">
        Kalite onayı bekleyen ilanlar
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Düşük kapak puanı nedeniyle düzenleyip yeniden gönderen ilanlar. Onay
        sonrası ilan yayına alınır ve kalite değerlendirmesi tekrar çalışır.
      </p>
      <AdminQualityResubmitTable initialRows={rows} />
    </div>
  );
}
