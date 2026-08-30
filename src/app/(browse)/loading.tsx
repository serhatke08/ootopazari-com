import { HomeBrowseSkeleton } from "@/components/skeletons/PageSkeletons";

/** Yalnızca ana sayfa. İlan detay iskeleti `NavSkeletonGate` + sayfa içi Suspense. */
export default function RootLoading() {
  return <HomeBrowseSkeleton />;
}
