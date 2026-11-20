"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { getLenis } from "@/components/SmoothScroll";

/** Goes home; when already home, glides back to the top (the hero) instead of doing nothing. */
export default function HomeLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const pathname = usePathname();

  return (
    <Link
      {...props}
      href="/"
      onClick={(e) => {
        props.onClick?.(e);
        if (pathname !== "/") return;
        e.preventDefault();
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(0, { duration: 1.4 });
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    />
  );
}
