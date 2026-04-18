"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props =
  | { notificationId: string; markAll?: never }
  | { markAll: true; notificationId?: never };

export function NotificationsMarkControls(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markRead() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          "markAll" in props && props.markAll
            ? { markAll: true }
            : { notificationId: props.notificationId }
        ),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if ("markAll" in props && props.markAll) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void markRead()}
        className="text-xs font-medium text-zinc-700 underline hover:text-zinc-900 disabled:opacity-50"
      >
        {loading ? "…" : "Tümünü okundu işaretle"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void markRead()}
      className="shrink-0 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
    >
      {loading ? "…" : "Okundu"}
    </button>
  );
}
