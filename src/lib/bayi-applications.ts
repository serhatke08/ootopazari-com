import type { SupabaseClient } from "@supabase/supabase-js";
import { DEALER_TYPE_VALUES, type DealerType } from "@/lib/dealer-types";

export type BayiApplicationMenuRow = {
  id: string;
  dealer_type: DealerType | null;
  dealer_name: string | null;
  status: "pending" | "approved" | string | null;
  created_at: string | null;
};

function normalizeDealerType(raw: unknown): DealerType | null {
  const v = typeof raw === "string" ? raw.trim().toLocaleLowerCase("tr") : "";
  return (DEALER_TYPE_VALUES as readonly string[]).includes(v)
    ? (v as DealerType)
    : null;
}

export async function fetchBayiApplicationsForMenu(
  supabase: SupabaseClient,
  userId: string
): Promise<BayiApplicationMenuRow[]> {
  const { data, error } = await supabase
    .from("bayi_applications")
    .select("id,dealer_type,dealer_name,status,created_at")
    .eq("user_id", userId)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("bayi_applications(menu):", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      dealer_type: normalizeDealerType(r.dealer_type),
      dealer_name:
        typeof r.dealer_name === "string" ? r.dealer_name.trim() || null : null,
      status: typeof r.status === "string" ? r.status : null,
      created_at: typeof r.created_at === "string" ? r.created_at : null,
    };
  });
}
