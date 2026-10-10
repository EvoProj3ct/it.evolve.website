"use client";

import { useLayoutEffect } from "react";

export function HomeScrollReset() {
  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    if (navigation?.type === "reload") {
      window.scrollTo(0, 0);

      // Some browsers apply their saved position after the first render.
      const resetAfterPaint = requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });

      return () => {
        cancelAnimationFrame(resetAfterPaint);
        window.history.scrollRestoration = previousRestoration;
      };
    }

    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  return null;
}
