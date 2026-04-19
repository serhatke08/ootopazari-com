"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminVerifiedBadge } from "@/components/AdminVerifiedBadge";
import { setProfileAvatarUrl } from "@/lib/profile-avatar-db";
import { AVATARS_BUCKET } from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;

function extractObjectPathFromPublicUrl(publicUrl: string): string | null {
  try {
    const marker = `/object/public/${AVATARS_BUCKET}/`;
    const i = publicUrl.indexOf(marker);
    if (i === -1) return null;
    let rest = publicUrl.slice(i + marker.length);
    const q = rest.indexOf("?");
    if (q !== -1) rest = rest.slice(0, q);
    return decodeURIComponent(rest);
  } catch {
    return null;
  }
}

async function saveProfileIdentity(
  userId: string,
  first: string,
  last: string,
  username: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createSupabaseBrowserClient();
  const fullName = [first, last].map((s) => s.trim()).filter(Boolean).join(" ").trim();

  const { data: existing, error: selErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) {
    return {
      ok: false,
      message: selErr.message || "Profil okunamadı.",
    };
  }

  const payload = {
    full_name: fullName || null,
    username: username.trim() || null,
  };

  if (existing) {
    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    if (error) {
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase.from("profiles").insert({ id: userId, ...payload });
    if (error) {
      return { ok: false, message: error.message };
    }
  }

  await supabase.auth.updateUser({
    data: {
      first_name: first.trim() || undefined,
      last_name: last.trim() || undefined,
      full_name: fullName || undefined,
    },
  });

  return { ok: true };
}

export type ProfilHeaderProps = {
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null | undefined;
  avatarSrc: string | null;
  initialsLabel: string;
  verifiedBadge?: boolean;
  hasAvatar: boolean;
  username: string | null;
  publicProfileHref: string;
  followerCount: number;
  followingCount: number;
};

export function ProfilHeader({
  displayName,
  firstName: initialFirst,
  lastName: initialLast,
  email,
  avatarSrc: initialAvatarSrc,
  initialsLabel: initialInitials,
  verifiedBadge = false,
  hasAvatar: initialHasAvatar,
  username: initialUsername,
  publicProfileHref,
  followerCount,
  followingCount,
}: ProfilHeaderProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(initialFirst ?? "");
  const [lastName, setLastName] = useState(initialLast ?? "");
  const [username, setUsername] = useState(initialUsername ?? "");

  useEffect(() => {
    setFirstName(initialFirst ?? "");
    setLastName(initialLast ?? "");
    setUsername(initialUsername ?? "");
  }, [initialFirst, initialLast, initialUsername]);

  const avatarSrc = initialAvatarSrc;
  const initialsLabel = initialInitials;
  const hasAvatar = initialHasAvatar;

  const closePhotoMenu = useCallback(() => setPhotoMenuOpen(false), []);

  useEffect(() => {
    if (!photoMenuOpen) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPhotoMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [photoMenuOpen]);

  useEffect(() => {
    if (!viewOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewOpen]);

  function cancelEdit() {
    setEditing(false);
    setSaveErr(null);
    setPhotoErr(null);
    closePhotoMenu();
    setFirstName(initialFirst ?? "");
    setLastName(initialLast ?? "");
    setUsername(initialUsername ?? "");
  }

  async function saveEdit() {
    setSaveErr(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaveErr("Oturum yok.");
        return;
      }
      const r = await saveProfileIdentity(user.id, firstName, lastName, username);
      if (!r.ok) {
        setSaveErr(r.message);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setSaveErr("Kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File) {
    setPhotoErr(null);
    if (file.size > MAX_BYTES) {
      setPhotoErr("En fazla 5 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPhotoErr("Yalnızca resim.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
        ? ext
        : "jpg";
      const path = `${user.id}/profile-${Date.now()}.${safeExt}`;

      const { error: upErr } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "image/jpeg",
          cacheControl: "3600",
        });
      if (upErr) {
        setPhotoErr(upErr.message);
        return;
      }

      const { data: pub } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const db = await setProfileAvatarUrl(supabase, user.id, publicUrl);
      if (!db.ok) {
        await supabase.storage.from(AVATARS_BUCKET).remove([path]);
        setPhotoErr(db.message);
        return;
      }

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      closePhotoMenu();
      router.refresh();
    } catch {
      setPhotoErr("Yükleme hatası.");
    } finally {
      setLoading(false);
    }
  }

  async function removeAvatar() {
    if (!hasAvatar) return;
    setLoading(true);
    closePhotoMenu();
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: row } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const raw = row?.avatar_url != null ? String(row.avatar_url) : "";
      const path = raw ? extractObjectPathFromPublicUrl(raw) : null;
      if (path) {
        await supabase.storage.from(AVATARS_BUCKET).remove([path]);
      }

      await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      await supabase.auth.updateUser({ data: { avatar_url: null } });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const avatarBlock = (
    <div
      className={
        editing
          ? "group relative mx-auto h-28 w-28 shrink-0 sm:mx-0"
          : "relative mx-auto h-28 w-28 shrink-0 sm:mx-0"
      }
      ref={menuRef}
    >
      <div className="relative h-full w-full overflow-hidden rounded-full bg-zinc-200 ring-2 ring-zinc-300 ring-offset-2 ring-offset-white">
        {avatarSrc ? (
          <Image
            src={avatarSrc}
            alt=""
            width={112}
            height={112}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-3xl font-bold text-zinc-600"
            aria-hidden
          >
            {initialsLabel}
          </div>
        )}

        {editing ? (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                setPhotoMenuOpen((o) => !o);
              }}
              className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-full bg-black/45 text-3xl font-light leading-none text-white opacity-100 transition-opacity hover:bg-black/55 md:opacity-0 md:group-hover:opacity-100"
              aria-expanded={photoMenuOpen}
              aria-haspopup="menu"
              aria-label="Fotoğraf seçenekleri"
            >
              +
            </button>

            {photoMenuOpen ? (
              <div
                className="absolute left-1/2 top-[calc(100%+8px)] z-20 min-w-[11rem] -translate-x-1/2 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
                role="menu"
              >
                {avatarSrc ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                    onClick={() => {
                      setViewOpen(true);
                      closePhotoMenu();
                    }}
                  >
                    Büyüt
                  </button>
                ) : null}
                {hasAvatar ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={loading}
                    className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                    onClick={() => void removeAvatar()}
                  >
                    Kaldır
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  disabled={loading}
                  className="block w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                  onClick={() => inputRef.current?.click()}
                >
                  Değiştir
                </button>
              </div>
            ) : null}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadFile(file);
                closePhotoMenu();
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="mt-6 border-b border-zinc-200 pb-8">
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 px-4 py-8 sm:flex-row sm:items-start sm:gap-8 sm:px-8">
          {avatarBlock}

          <div className="min-w-0 flex-1">
            {photoErr ? (
              <p className="mb-3 text-center text-xs text-red-600 sm:text-left" role="alert">
                {photoErr}
              </p>
            ) : null}

            {!editing ? (
              <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                    {displayName.trim() || "—"}
                  </h2>
                  {verifiedBadge ? <AdminVerifiedBadge size={22} /> : null}
                </div>

                {initialUsername?.trim() ? (
                  <div className="flex flex-col items-center gap-1 sm:items-start">
                    <Link
                      href={publicProfileHref}
                      className="text-base font-semibold text-emerald-800 hover:underline"
                    >
                      @{initialUsername.trim()}
                    </Link>
                    <p className="text-xs text-zinc-500">Herkese açık profil bağlantın</p>
                  </div>
                ) : (
                  <p className="max-w-md text-sm text-zinc-600">
                    <span className="font-medium text-zinc-800">Kullanıcı adı yok.</span>{" "}
                    Düzenle ile ekleyerek profil adresini kişiselleştirebilirsin.
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-y border-zinc-100 py-3 text-sm text-zinc-700 sm:justify-start">
                  <div>
                    <span className="tabular-nums text-lg font-bold text-zinc-900">
                      {followerCount.toLocaleString("tr-TR")}
                    </span>{" "}
                    <span className="text-zinc-600">Takipçi</span>
                  </div>
                  <div className="hidden h-4 w-px bg-zinc-200 sm:block" aria-hidden />
                  <div>
                    <span className="tabular-nums text-lg font-bold text-zinc-900">
                      {followingCount.toLocaleString("tr-TR")}
                    </span>{" "}
                    <span className="text-zinc-600">Takip</span>
                  </div>
                </div>

                <div className="w-full max-w-md rounded-xl bg-zinc-50 px-3 py-2.5 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Giriş e-postası
                  </p>
                  <p className="mt-0.5 truncate text-sm text-zinc-800">{email ?? "—"}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setPhotoErr(null);
                    setSaveErr(null);
                  }}
                  className="mt-1 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                >
                  Profili düzenle
                </button>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-md flex-col gap-3 sm:mx-0">
                <p className="text-center text-sm font-medium text-zinc-700 sm:text-left">
                  Ad, soyad ve kullanıcı adı
                </p>
                <label className="block text-left text-xs font-medium text-zinc-600">
                  Ad
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                    autoComplete="given-name"
                  />
                </label>
                <label className="block text-left text-xs font-medium text-zinc-600">
                  Soyad
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                    autoComplete="family-name"
                  />
                </label>
                <label className="block text-left text-xs font-medium text-zinc-600">
                  Kullanıcı adı
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                    autoComplete="username"
                  />
                </label>

                <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Giriş e-postası
                  </p>
                  <p className="mt-0.5 truncate text-sm text-zinc-800">{email ?? "—"}</p>
                  <p className="mt-1 text-xs text-zinc-500">E-posta buradan değiştirilemez.</p>
                </div>

                {saveErr ? (
                  <p className="text-center text-xs text-red-600 sm:text-left" role="alert">
                    {saveErr}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void saveEdit()}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {loading ? "Kaydediliyor…" : "Kaydet"}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={cancelEdit}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {viewOpen && avatarSrc ? (
        <button
          type="button"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setViewOpen(false)}
          aria-label="Kapat"
        >
          <span className="sr-only">Kapat</span>
          <img
            src={avatarSrc}
            alt=""
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      ) : null}
    </div>
  );
}
