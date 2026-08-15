"use client";

import { useCallback, useState } from "react";
import { AccountSettingsPanel } from "@/components/AccountSettingsPanel";
import { CenteredDialog } from "@/components/CenteredDialog";

function SettingsGearIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className ?? "h-5 w-5"}
      aria-hidden
    >
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 13a7.7 7.7 0 0 0 .05-2l2.02-1.57-2-3.46-2.4.56a7.8 7.8 0 0 0-1.73-1L14.9 3h-5.8l-.44 2.53a7.8 7.8 0 0 0-1.73 1l-2.4-.56-2 3.46L4.55 11a7.7 7.7 0 0 0 0 2l-2.02 1.57 2 3.46 2.4-.56a7.8 7.8 0 0 0 1.73 1L9.1 21h5.8l.44-2.53a7.8 7.8 0 0 0 1.73-1l2.4.56 2-3.46L19.4 13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProfilTitleRow({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Profilim
      </h1>
      <button
        type="button"
        aria-label="Ayarlar"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
          open
            ? "border-zinc-900 bg-zinc-900 text-white"
            : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
        }`}
      >
        <SettingsGearIcon className="h-5 w-5" />
      </button>
      {open ? (
        <CenteredDialog
          title="Ayarlar"
          titleId="profil-ayarlar-dialog"
          onClose={close}
          className="max-w-lg"
        >
          <AccountSettingsPanel email={email} />
        </CenteredDialog>
      ) : null}
    </div>
  );
}
