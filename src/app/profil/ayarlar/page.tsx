import { redirect } from "next/navigation";

/** Eski ayarlar URL’si — e-Devlet kapalıyken profil ana sayfasına. */
export default function ProfilAyarlarPage() {
  redirect("/profil");
}
