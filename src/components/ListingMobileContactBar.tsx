"use client";

import { StartConversationButton } from "@/components/messages/StartConversationButton";
import { ListingContactPhone } from "@/components/ListingContactPhone";

type Props = {
  listingId: string;
  ownerUserId: string;
  showMessage: boolean;
  showPhone: boolean;
  phone: string;
};

export function ListingMobileContactBar({
  listingId,
  ownerUserId,
  showMessage,
  showPhone,
  phone,
}: Props) {
  if (!showMessage && !showPhone) return null;

  return (
    <div
      className="fixed inset-x-0 z-40 border-t border-black/10 bg-white/95 px-4 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md max-md:block md:hidden"
      style={{
        bottom: "calc(4.35rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="mx-auto flex max-w-[1400px] gap-2">
        {showMessage ? (
          <div className={showPhone ? "min-w-0 flex-1" : "w-full"}>
            <StartConversationButton
              listingId={listingId}
              ownerUserId={ownerUserId}
            />
          </div>
        ) : null}
        {showPhone ? (
          <div className={showMessage ? "min-w-0 flex-1" : "w-full"}>
            <ListingContactPhone phone={phone} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
