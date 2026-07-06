"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { ListingPublicChatPanelSkeleton } from "@/components/listing/ListingPublicChatPanelSkeleton";

const ListingPublicChatPanel = dynamic(
  () =>
    import("@/components/listing/ListingPublicChatPanel").then(
      (m) => m.ListingPublicChatPanel
    ),
  {
    ssr: false,
    loading: () => <ListingPublicChatPanelSkeleton />,
  }
);

type Props = ComponentProps<typeof ListingPublicChatPanel>;

export function ListingPublicChatPanelLoader(props: Props) {
  return <ListingPublicChatPanel {...props} />;
}
