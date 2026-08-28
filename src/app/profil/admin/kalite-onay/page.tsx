import { redirect } from "next/navigation";

/** Eski sekme kaldırıldı — kalite onayı mobil admin panelindedir. */
export default function AdminKaliteOnayRedirectPage() {
  redirect("/profil/admin/ilanlar");
}
