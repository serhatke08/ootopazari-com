import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchUserNotifications } from "@/lib/user-notifications";
import { NotificationsMarkControls } from "@/components/NotificationsMarkControls";

export default async function ProfilBildirimlerPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const rows = await fetchUserNotifications(supabase, user.id, 80);
  const listingIds = [
    ...new Set(
      rows
        .map((r) => r.listing_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ];
  const listingNumMap = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: listings } = await supabase
      .from("listings")
      .select("id,listing_number")
      .in("id", listingIds);
    for (const row of listings ?? []) {
      const o = row as { id: string; listing_number: number | string | null };
      if (o.listing_number != null) {
        listingNumMap.set(o.id, String(o.listing_number));
      }
    }
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Bildirimler</h2>
        {rows.some((r) => r.read_at == null) ? (
          <NotificationsMarkControls markAll />
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">Henüz bildirim yok.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((n) => {
            const unread = n.read_at == null;
            return (
              <li key={n.id}>
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    unread
                      ? "border-amber-200 bg-amber-50/80"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold text-zinc-900">{n.title}</p>
                    {unread ? (
                      <NotificationsMarkControls notificationId={n.id} />
                    ) : null}
                  </div>
                  {n.body ? (
                    <p className="mt-1.5 whitespace-pre-wrap text-zinc-700">{n.body}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <time dateTime={n.created_at}>
                      {new Date(n.created_at).toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    {n.listing_id ? (
                      listingNumMap.has(n.listing_id) ? (
                        <Link
                          href={`/ilan/${listingNumMap.get(n.listing_id)}`}
                          className="font-medium text-zinc-800 underline hover:text-zinc-950"
                        >
                          İlana git
                        </Link>
                      ) : (
                        <Link
                          href="/profil/ilanlarim"
                          className="font-medium text-zinc-800 underline hover:text-zinc-950"
                        >
                          İlanlarım
                        </Link>
                      )
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
