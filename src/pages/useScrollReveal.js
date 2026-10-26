import { useEffect } from "react";

/**
 * Adds the "lf-in" class to every .lf-reveal element once it scrolls into view
 */
export default function useScrollReveal(dep) {
  useEffect(() => {
    const els = document.querySelectorAll(".lf-reveal:not(.lf-in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("lf-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("lf-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}