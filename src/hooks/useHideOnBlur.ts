import { useEffect } from "react";
import { api } from "../api";
import type { Overlay } from "../types";

/**
 * Hides the window on a *real* focus loss. A blur right after showing is
 * ignored (600ms grace), and an actual hide is deferred 250ms and only fires
 * if the document still doesn't have focus — this avoids the window closing
 * itself on the transient unfocused state that X11/mutter produce on open.
 * Re-focuses the search input when focus returns (unless an overlay is up).
 */
export function useHideOnBlur({
  overlay,
  focusSearch,
  shownAtRef,
}: {
  overlay: Overlay;
  focusSearch: () => void;
  shownAtRef: React.RefObject<number>;
}) {
  useEffect(() => {
    const onBlur = () => {
      if (Date.now() - shownAtRef.current < 600) return;
      window.setTimeout(() => {
        if (!document.hasFocus()) api.hideWindow("blur");
      }, 250);
    };
    const onFocus = () => {
      if (!overlay) focusSearch();
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [focusSearch, overlay, shownAtRef]);
}
