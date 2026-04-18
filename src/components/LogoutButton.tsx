"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.refresh();
      router.push("/");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={pending}
      className="rounded-md border border-zinc-900/30 bg-zinc-900/10 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-900/20 disabled:opacity-50"
    >
      {pending ? "…" : "Çıkış"}
    </button>
  );
}
