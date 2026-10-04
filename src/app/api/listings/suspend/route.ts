import { NextResponse } from "next/server";
import { requireAdminServiceClient } from "@/lib/admin-api";

/** Web + mobil admin: askıya al, bildirim + destek mesajı. */
export async function POST(req: Request) {
  const auth = await requireAdminServiceClient();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, message: auth.message },
      { status: auth.status }
    );
  }

  let body: { listingId?: unknown; reason?: unknown };
  try {
    body = (await req.json()) as { listingId?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const listingId =
    typeof body.listingId === "string" && body.listingId.trim() !== ""
      ? body.listingId.trim()
      : null;
  const reason =
    typeof body.reason === "string" ? body.reason.trim() : "";
  if (!listingId) {
    return NextResponse.json({ ok: false, error: "listingId" }, { status: 400 });
  }

  const { data: listing, error: fetchErr } = await auth.service
    .from("listings")
    .select("id,user_id,listing_number,title,moderation_status")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchErr || !listing || typeof listing !== "object") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const row = listing as {
    user_id: string | null;
    listing_number: number | string | null;
    title?: string | null;
    moderation_status?: string | null;
  };

  if (String(row.moderation_status ?? "").toLowerCase() === "suspended") {
    return NextResponse.json(
      { ok: false, error: "already_suspended" },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { error: updErr } = await auth.service
    .from("listings")
    .update({
      moderation_status: "suspended",
      suspension_reason: reason.length > 0 ? reason : null,
      suspended_at: now,
      reviewed_at: now,
      reviewed_by: auth.userId,
    })
    .eq("id", listingId);

  if (updErr) {
    // RPC yolu (yetki açıldıysa)
    const { error: rpcErr } = await auth.service.rpc("suspend_listing", {
      p_listing_id: listingId,
      p_reason: reason.length > 0 ? reason : null,
    });
    if (rpcErr) {
      console.warn("admin suspend listing:", updErr.message, rpcErr.message);
      return NextResponse.json(
        { ok: false, error: "update_failed", message: updErr.message },
        { status: 500 }
      );
    }
  }

  const ownerId = row.user_id;
  if (ownerId && ownerId !== auth.userId) {
    const num = row.listing_number != null ? String(row.listing_number) : "";
    const title = (row.title ?? "").trim() || "İlan";
    const notifBody =
      num !== ""
        ? reason
          ? `İlan no #${num} yayından kaldırıldı. Sebep: ${reason}`
          : `İlan no #${num} yayından kaldırıldı.`
        : reason
          ? `İlanınız yayından kaldırıldı. Sebep: ${reason}`
          : "İlanınız yayından kaldırıldı.";

    // Destek sohbeti + mesaj (sahibe gider; message trigger bildirim de üretebilir)
    let conversationId: string | null = null;
    try {
      let ticketId: string | null = null;
      const { data: existingTicket } = await auth.service
        .from("support_tickets")
        .select("id")
        .eq("user_id", ownerId)
        .eq("admin_user_id", auth.userId)
        .maybeSingle();
      ticketId =
        existingTicket && typeof existingTicket === "object"
          ? String((existingTicket as { id: string }).id)
          : null;

      if (!ticketId) {
        const { data: createdTicket, error: ticketErr } = await auth.service
          .from("support_tickets")
          .insert({ user_id: ownerId, admin_user_id: auth.userId })
          .select("id")
          .single();
        if (ticketErr) {
          console.warn("support_tickets insert:", ticketErr.message);
        } else {
          ticketId = String((createdTicket as { id: string }).id);
        }
      }

      if (ticketId) {
        const { data: existingConv } = await auth.service
          .from("conversations")
          .select("id")
          .eq("support_ticket_id", ticketId)
          .maybeSingle();
        conversationId =
          existingConv && typeof existingConv === "object"
            ? String((existingConv as { id: string }).id)
            : null;

        if (!conversationId) {
          const { data: createdConv, error: convErr } = await auth.service
            .from("conversations")
            .insert({
              listing_id: null,
              support_ticket_id: ticketId,
              sender_id: ownerId,
              receiver_id: auth.userId,
            })
            .select("id")
            .single();
          if (convErr) {
            console.warn("conversations insert:", convErr.message);
          } else {
            conversationId = String((createdConv as { id: string }).id);
          }
        }
      }

      if (conversationId) {
        const msgBody = [
          "İlanınız askıya alındı.",
          "",
          `İlan: ${title}${num ? ` (#${num})` : ""}`,
          reason ? `Sebep: ${reason}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        const { error: msgErr } = await auth.service.from("messages").insert({
          conversation_id: conversationId,
          sender_id: auth.userId,
          content: msgBody,
          is_read: false,
        });
        if (msgErr) {
          console.warn("suspend support message:", msgErr.message);
        } else {
          await auth.service
            .from("conversations")
            .update({ updated_at: now })
            .eq("id", conversationId);
        }
      }
    } catch (e) {
      console.warn("suspend support chat:", e);
    }

    // Bildirim (listing_suspended; constraint yoksa message ile düş)
    const notifPayload: Record<string, unknown> = {
      user_id: ownerId,
      recipient_id: ownerId,
      actor_id: auth.userId,
      type: "listing_suspended",
      title: "İlanınız askıya alındı",
      body: notifBody,
      listing_id: listingId,
    };
    if (conversationId) notifPayload.conversation_id = conversationId;

    let { error: notifErr } = await auth.service
      .from("user_notifications")
      .insert(notifPayload);
    if (notifErr) {
      console.warn("user_notifications insert:", notifErr.message);
      const fallback = {
        user_id: ownerId,
        recipient_id: ownerId,
        actor_id: auth.userId,
        type: "message",
        title: "İlanınız askıya alındı",
        body: notifBody,
        listing_id: listingId,
        conversation_id: conversationId,
      };
      ({ error: notifErr } = await auth.service
        .from("user_notifications")
        .insert(fallback));
      if (notifErr) {
        console.warn("user_notifications fallback:", notifErr.message);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
