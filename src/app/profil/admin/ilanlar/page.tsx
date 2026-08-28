import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminListingsTable } from "@/components/admin/AdminListingsTable";
import { fetchAdminListingsForGrid } from "@/lib/admin-listings";
import { fetchAdminProfileByUserId } from "@/lib/admin-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Admin — İlanlar",
  robots: { index: false, follow: false },
};

export default async function AdminListingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/giris?next=${encodeURIComponent("/profil/admin/ilanlar")}`);
  }

  const adminProfile = await fetchAdminProfileByUserId(supabase, user.id);
  if (!adminProfile) {
    redirect("/profil");
  }

  const service = createSupabaseServiceClient();
  const rows = service ? await fetchAdminListingsForGrid(service) : [];

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold tracking-tight text-zinc-900">
        Web admin — ilanlar
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Yalnızca silme ve askıya alma. Kapak puanı onayı için{" "}
        <span className="font-medium text-zinc-800">Kalite onayı</span> sekmesine
        bakın.
      </p>
      <AdminListingsTable initialRows={rows} />
    </div>
  );
}
