import Image from "next/image";
import Link from "next/link";
import { ListingContactPhone } from "@/components/ListingContactPhone";
import { StartConversationButton } from "@/components/messages/StartConversationButton";
import { AdminVerifiedBadge } from "@/components/AdminVerifiedBadge";

type Props = {
  sellerUserId: string;
  sellerDisplayName: string | null;
  sellerAvSrc: string | null;
  verified?: boolean;
  listingId: string | undefined;
  showMessage: boolean;
  showPhone: boolean;
  phone: string;
};

export function ListingDetailContactDock({
  sellerUserId,
  sellerDisplayName,
  sellerAvSrc,
  verified = false,
  listingId,
  showMessage,
  showPhone,
  phone,
}: Props) {
  const name = sellerDisplayName?.trim() || "Satıcı";
  const initial = name.slice(0, 1).toLocaleUpperCase("tr") || "?";

  return (
    <div
      className="fixed inset-x-0 z-[45] border-t border-zinc-200 bg-white/95 px-3 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden"
      style={{
        bottom: "calc(3.45rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-2">
        <Link
          href={`/kullanici/${sellerUserId}`}
          className="flex min-w-0 items-center gap-2.5"
        >
          {sellerAvSrc ? (
            <Image
              src={sellerAvSrc}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-700">
              {initial}
            </span>
          )}
          <span className="min-w-0 truncate text-sm font-semibold text-zinc-900">
            {name}
          </span>
          {verified ? <AdminVerifiedBadge /> : null}
        </Link>
        {showMessage || showPhone ? (
          <div className="flex gap-2">
            {showMessage && listingId ? (
              <div className={showPhone ? "min-w-0 flex-1" : "w-full"}>
                <StartConversationButton
                  listingId={listingId}
                  ownerUserId={sellerUserId}
                  label="Mesaj"
                  className="w-full rounded-lg bg-[#ffcc00] px-3 py-2.5 text-sm font-semibold text-zinc-900"
                />
              </div>
            ) : null}
            {showPhone ? (
              <div className={showMessage ? "min-w-0 flex-1" : "w-full"}>
                <ListingContactPhone phone={phone} compact />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
