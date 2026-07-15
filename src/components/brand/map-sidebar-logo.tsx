"use client";

import Image from "next/image";
import Link from "next/link";

import { BRAND_LOGOS, BRAND_SHORT_NAME } from "@/config/brand";
import { useSidebar } from "@/components/ui/sidebar";

export function MapSidebarLogo() {
  const { state } = useSidebar();

  if (state === "collapsed") {
    return (
      <Link href="/lead" className="flex size-11 items-center justify-center">
        <Image
          src={BRAND_LOGOS.icon}
          alt={BRAND_SHORT_NAME}
          width={40}
          height={40}
          className="size-9 object-contain"
        />
      </Link>
    );
  }

  return (
    <Link href="/lead" className="flex items-center justify-center px-0.5">
      <Image
        src={BRAND_LOGOS.wordmark}
        alt={BRAND_SHORT_NAME}
        width={160}
        height={56}
        priority
        className="h-11 w-auto max-w-[11rem] object-contain"
      />
    </Link>
  );
}
