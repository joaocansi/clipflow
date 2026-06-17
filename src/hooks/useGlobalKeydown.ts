import { useEffect } from "react";

/**
 * Routes keydown at the window level so keys work even before DOM focus has
 * landed inside the panel (otherwise the first key after opening is "eaten"
 * while focus settles). Native KeyboardEvent is shape-compatible with the
 * fields the handler reads.
 */
export function useGlobalKeydown(handler: (e: React.KeyboardEvent) => void) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) =>
      handler(e as unknown as React.KeyboardEvent);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handler]);
}
