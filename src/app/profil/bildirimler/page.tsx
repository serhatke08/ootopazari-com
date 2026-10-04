import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildListingSeoPath } from "@/lib/listing-seo";
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
  const listingHrefMap = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: listings } = await supabase
      .from("listings")
      .select("id,listing_number,title")
      .in("id", listingIds);
    for (const row of listings ?? []) {
      const o = row as {
        id: string;
        listing_number: number | string | null;
        title?: string | null;
      };
      const href = buildListingSeoPath(o.listing_number, o.title ?? null);
      if (href) {
        listingHrefMap.set(o.id, href);
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
            const href =
              n.type === "message" && n.conversation_id
                ? `/mesajlar/${n.conversation_id}`
                : n.listing_id && listingHrefMap.has(n.listing_id)
                  ? listingHrefMap.get(n.listing_id)!
                  : n.conversation_id
                    ? `/mesajlar/${n.conversation_id}`
                    : null;
            const cardClass = `rounded-xl border px-4 py-3 text-sm ${
              unread
                ? "border-amber-200 bg-amber-50/80"
                : "border-zinc-200 bg-white"
            }`;

            return (
              <li key={n.id} className={cardClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {href ? (
                    <Link
                      href={href}
                      className="min-w-0 flex-1 font-semibold text-zinc-900 hover:underline"
                    >
                      {n.title}
                    </Link>
                  ) : (
                    <p className="min-w-0 flex-1 font-semibold text-zinc-900">
                      {n.title}
                    </p>
                  )}
                  {unread ? (
                    <NotificationsMarkControls notificationId={n.id} />
                  ) : null}
                </div>
                {href ? (
                  <Link href={href} className="mt-1.5 block">
                    {n.body ? (
                      <p className="whitespace-pre-wrap text-zinc-700">
                        {n.body}
                      </p>
                    ) : null}
                    <div className="mt-2 text-xs text-zinc-500">
                      <time dateTime={n.created_at}>
                        {new Date(n.created_at).toLocaleString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                      <span className="ml-2 font-medium text-zinc-800 underline">
                        {n.type === "message" ||
                        (n.conversation_id && !n.listing_id)
                          ? "Mesaja git"
                          : "İlana git"}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <>
                    {n.body ? (
                      <p className="mt-1.5 whitespace-pre-wrap text-zinc-700">
                        {n.body}
                      </p>
                    ) : null}
                    <div className="mt-2 text-xs text-zinc-500">
                      <time dateTime={n.created_at}>
                        {new Date(n.created_at).toLocaleString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
