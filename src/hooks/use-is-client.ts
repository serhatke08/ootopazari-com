import { useSyncExternalStore } from "react";

/** SSR ve ilk hydrate aynı `false` döner; hydration sonrası `true`. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
