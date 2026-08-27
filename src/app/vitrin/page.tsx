import { permanentRedirect } from "next/navigation";

/** Eski /vitrin → /sifir-araclar */
export default function VitrinRedirectPage() {
  permanentRedirect("/sifir-araclar");
}
