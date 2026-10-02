"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CenteredDialog } from "@/components/CenteredDialog";
import { WEB_EIDS_UI_ENABLED } from "@/lib/eids-ui";

type Props = {
  emailVerified?: boolean;
  phoneOk?: boolean;
  eidsOk?: boolean;
  email?: string | null;
  phone?: string | null;
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
        ok ? "bg-emerald-500" : "bg-amber-400"
      }`}
      aria-hidden
    />
  );
}

export function ProfileVerificationBadges({
  emailVerified: emailVerifiedProp,
  phoneOk: phoneOkProp,
  eidsOk: eidsOkProp,
  email: emailProp,
  phone: phoneProp,
}: Props) {
  const [open, setOpen] = useState(false);
  const [emailOk, setEmailOk] = useState(Boolean(emailVerifiedProp));
  const [phoneOk, setPhoneOk] = useState(Boolean(phoneOkProp));
  const [eidsOk, setEidsOk] = useState(Boolean(eidsOkProp));
  const [email, setEmail] = useState(emailProp ?? null);
  const [phone, setPhone] = useState(phoneProp ?? null);

  useEffect(() => {
    if (emailVerifiedProp != null) setEmailOk(emailVerifiedProp);
    if (phoneOkProp != null) setPhoneOk(phoneOkProp);
    if (eidsOkProp != null) setEidsOk(eidsOkProp);
    if (emailProp !== undefined) setEmail(emailProp);
    if (phoneProp !== undefined) setPhone(phoneProp);
  }, [emailVerifiedProp, phoneOkProp, eidsOkProp, emailProp, phoneProp]);

  useEffect(() => {
    if (
      emailVerifiedProp != null &&
      phoneOkProp != null &&
      eidsOkProp != null
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const emailConfirmed = Boolean(
          (user as { email_confirmed_at?: string | null }).email_confirmed_at ||
            user.confirmed_at
        );
        let nextPhone = phoneProp ?? null;
        let nextPhoneOk = Boolean(phoneOkProp);
        let nextEids = Boolean(eidsOkProp);
        const { data: row } = await supabase
          .from("profiles")
          .select("phone, eids_kullanici_kodu")
          .eq("id", user.id)
          .maybeSingle();
        const p = (row as { phone?: string | null } | null)?.phone?.trim();
        if (p) {
          nextPhone = p;
          nextPhoneOk = true;
        }
        const kod = (
          row as { eids_kullanici_kodu?: string | null } | null
        )?.eids_kullanici_kodu;
        if (kod && String(kod).trim()) nextEids = true;
        if (cancelled) return;
        setEmailOk(emailConfirmed);
        setEmail(user.email ?? null);
        setPhone(nextPhone);
        setPhoneOk(nextPhoneOk);
        setEidsOk(nextEids);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [emailVerifiedProp, phoneOkProp, eidsOkProp, phoneProp]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
        aria-label="Doğrulama durumu"
        title="Doğrulama durumu"
      >
        <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z" />
          </svg>
          <StatusDot ok={emailOk} />
        </span>
        <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8Z" />
          </svg>
          <StatusDot ok={phoneOk} />
        </span>
        {WEB_EIDS_UI_ENABLED ? (
          <span className="relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200">
            <Image
              src="/branding/edevlet_icon.png"
              alt=""
              width={22}
              height={22}
              className="h-[18px] w-[18px] object-contain"
              unoptimized
            />
            <StatusDot ok={eidsOk} />
          </span>
        ) : null}
      </button>

      {open ? (
        <CenteredDialog
          title="Doğrulama"
          titleId="profil-verification-dialog"
          onClose={close}
          className="max-w-md"
        >
          <ul className="space-y-3">
            <li className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-700 ring-1 ring-zinc-200">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900">E-posta</p>
                <p className="truncate text-sm text-zinc-600">{email || "—"}</p>
                <p
                  className={`mt-1 text-xs font-semibold ${
                    emailOk ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {emailOk ? "Doğrulandı" : "Bekliyor"}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-700 ring-1 ring-zinc-200">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8Z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900">Telefon</p>
                <p className="truncate text-sm text-zinc-600">{phone || "—"}</p>
                <p
                  className={`mt-1 text-xs font-semibold ${
                    phoneOk ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {phoneOk ? "Kayıtlı" : "Eksik"}
                </p>
              </div>
            </li>
            {WEB_EIDS_UI_ENABLED ? (
              <li className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200">
                  <Image
                    src="/branding/edevlet_icon.png"
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                    unoptimized
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900">e-Devlet</p>
                  <p className="text-sm text-zinc-600">
                    {eidsOk ? "Kimlik doğrulandı" : "Henüz doğrulanmadı"}
                  </p>
                  <p
                    className={`mt-1 text-xs font-semibold ${
                      eidsOk ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {eidsOk ? "Doğrulandı" : "Bekliyor"}
                  </p>
                  {!eidsOk ? (
                    <Link
                      href="/profil/eids"
                      onClick={close}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#ffcc00] px-3 py-1.5 text-xs font-bold text-zinc-900 hover:bg-[#f0c000]"
                    >
                      <Image
                        src="/branding/edevlet_icon.png"
                        alt=""
                        width={16}
                        height={16}
                        className="h-4 w-4 object-contain"
                        unoptimized
                      />
                      e-Devlet ile doğrula
                    </Link>
                  ) : null}
                </div>
              </li>
            ) : null}
          </ul>
        </CenteredDialog>
      ) : null}
    </>
  );
}
