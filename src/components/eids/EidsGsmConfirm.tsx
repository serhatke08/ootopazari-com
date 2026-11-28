"use client";

import { useEffect, useState } from "react";
import { CenteredDialog } from "@/components/CenteredDialog";
import { toTrMobile10 } from "@/lib/listing-create";

type Props = {
  open: boolean;
  initial?: string | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (gsm: string) => void;
};

export function EidsGsmConfirm({
  open,
  initial,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(toTrMobile10(initial ?? "") ?? "");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(toTrMobile10(initial ?? "") ?? "");
    setErr(null);
  }, [open, initial]);

  if (!open) return null;

  return (
    <CenteredDialog
      title="e-Devlet telefonu"
      titleId="eids-gsm-confirm"
      onClose={onCancel}
    >
      <p className="text-sm leading-snug text-zinc-700">
        e-Devlet’teki cep numaran olmalı (5xxxxxxxxx). Uyuşmazsa doğrulama iptal
        olur.
      </p>
      <label className="mt-3 block text-sm font-semibold text-zinc-900">
        Cep
        <input
          className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-base font-semibold tracking-wide"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="5xxxxxxxxx"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, "").slice(0, 11));
            setErr(null);
          }}
        />
      </label>
      {err ? (
        <p className="mt-2 text-sm font-semibold text-red-700">{err}</p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-[#111111] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        onClick={() => {
          const gsm = toTrMobile10(value);
          if (!gsm) {
            setErr("Geçerli cep gir (5xxxxxxxxx).");
            return;
          }
          onConfirm(gsm);
        }}
      >
        Kaydet ve e-Devlet’e git
      </button>
    </CenteredDialog>
  );
}
