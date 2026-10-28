"use client";

import { useEffect } from "react";

const OFFSET = 8;

/**
 * Marks the page `data-scrolled` once it has scrolled a little, so the headers can show their shadow
 * only then (`[html[data-scrolled]_&]:shadow-header`) and sit flat at the top of the page.
 */
export function ScrollShadow() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => root.toggleAttribute("data-scrolled", window.scrollY > OFFSET);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      root.removeAttribute("data-scrolled");
    };
  }, []);
  return null;
}
