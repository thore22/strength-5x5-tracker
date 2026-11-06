import { useEffect, useLayoutEffect, useRef } from "react";

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

export function usePageScroll(
  ready: boolean,
  page: string,
  sessionId?: string,
) {
  const previous = useRef<{ page: string; sessionId?: string } | null>(null);
  useLayoutEffect(() => {
    if (!ready) return;
    const before = previous.current;
    previous.current = { page, sessionId };
    if (
      !before ||
      before.page !== page ||
      (page === "Workout" && sessionId && before.sessionId !== sessionId)
    ) {
      scrollToTop();
      const frame = requestAnimationFrame(scrollToTop);
      return () => cancelAnimationFrame(frame);
    }
  }, [ready, page, sessionId]);
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) scrollToTop();
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);
}
