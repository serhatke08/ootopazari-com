import { NextResponse } from "next/server";
import { requireAdminServiceClient } from "@/lib/admin-api";

function positiveInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/** Mobil/web admin: paket ekle/düzenle (service_role; RPC EXECUTE gerekmez). */
export async function POST(req: Request) {
  const auth = await requireAdminServiceClient();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, message: auth.message },
      { status: auth.status }
    );
  }

  let body: {
    id?: unknown;
    engineId?: unknown;
    name?: unknown;
    sortOrder?: unknown;
    engineCapacityCc?: unknown;
    horsepower?: unknown;
    listingIds?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const engineId =
    typeof body.engineId === "string" && body.engineId.trim() !== ""
      ? body.engineId.trim()
      : null;
  const name =
    typeof body.name === "string" ? body.name.trim() : "";
  const id =
    typeof body.id === "string" && body.id.trim() !== ""
      ? body.id.trim()
      : null;
  const cc = positiveInt(body.engineCapacityCc);
  const hp = positiveInt(body.horsepower);
  const sortOrder = positiveInt(body.sortOrder);
  const listingIds = Array.isArray(body.listingIds)
    ? body.listingIds
        .filter((x): x is string => typeof x === "string" && x.trim() !== "")
        .map((x) => x.trim())
    : [];

  if (!engineId) {
    return NextResponse.json({ ok: false, error: "engine_required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
  }

  const { data: engine, error: engErr } = await auth.service
    .from("vehicle_body_style_engines")
    .select("id")
    .eq("id", engineId)
    .maybeSingle();
  if (engErr || !engine) {
    return NextResponse.json({ ok: false, error: "engine_not_found" }, { status: 404 });
  }

  let packageId = id;
  let reused = false;

  if (packageId) {
    const patch: Record<string, unknown> = { name };
    if (cc != null) patch.engine_capacity_cc = cc;
    if (hp != null) patch.horsepower = hp;
    if (sortOrder != null) patch.sort_order = sortOrder;
    const { data, error } = await auth.service
      .from("vehicle_engine_packages")
      .update(patch)
      .eq("id", packageId)
      .eq("engine_id", engineId)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "update_failed" },
        { status: 500 }
      );
    }
    packageId = String(data.id);
  } else {
    const { data: existingRows, error: listErr } = await auth.service
      .from("vehicle_engine_packages")
      .select("id,name,sort_order,engine_capacity_cc,horsepower")
      .eq("engine_id", engineId)
      .order("sort_order", { ascending: true });
    if (listErr) {
      return NextResponse.json(
        { ok: false, error: listErr.message },
        { status: 500 }
      );
    }
    const target = name.toLocaleLowerCase("tr");
    const existing = (existingRows ?? []).find(
      (r) =>
        typeof r.name === "string" &&
        r.name.trim().toLocaleLowerCase("tr") === target
    );
    if (existing?.id) {
      reused = true;
      packageId = String(existing.id);
      const patch: Record<string, unknown> = {};
      if (cc != null) patch.engine_capacity_cc = cc;
      if (hp != null) patch.horsepower = hp;
      if (sortOrder != null) patch.sort_order = sortOrder;
      if (Object.keys(patch).length > 0) {
        await auth.service
          .from("vehicle_engine_packages")
          .update(patch)
          .eq("id", packageId);
      }
    } else {
      const maxSort = (existingRows ?? []).reduce((m, r) => {
        const s = typeof r.sort_order === "number" ? r.sort_order : 0;
        return Math.max(m, s);
      }, 0);
      const insert: Record<string, unknown> = {
        engine_id: engineId,
        name,
        sort_order: sortOrder ?? maxSort + 1,
      };
      if (cc != null) insert.engine_capacity_cc = cc;
      if (hp != null) insert.horsepower = hp;
      const { data, error } = await auth.service
        .from("vehicle_engine_packages")
        .insert(insert)
        .select("id")
        .single();
      if (error || !data) {
        // Unique race → reuse
        if (error?.code === "23505") {
          const { data: again } = await auth.service
            .from("vehicle_engine_packages")
            .select("id,name")
            .eq("engine_id", engineId);
          const hit = (again ?? []).find(
            (r) =>
              typeof r.name === "string" &&
              r.name.trim().toLocaleLowerCase("tr") === target
          );
          if (hit?.id) {
            packageId = String(hit.id);
            reused = true;
          } else {
            return NextResponse.json(
              { ok: false, error: error.message },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json(
            { ok: false, error: error?.message ?? "insert_failed" },
            { status: 500 }
          );
        }
      } else {
        packageId = String(data.id);
      }
    }
  }

  let updated = 0;
  if (packageId && listingIds.length > 0) {
    const { data: linked, error: linkErr } = await auth.service
      .from("listings")
      .update({ vehicle_engine_package_id: packageId })
      .in("id", listingIds)
      .select("id");
    if (!linkErr && linked) updated = linked.length;
  }

  return NextResponse.json({
    ok: true,
    id: packageId,
    reused,
    updated,
  });
}
