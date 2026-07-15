import Image from "next/image";
import Link from "next/link";

import { BRAND_LOGOS, BRAND_SHORT_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";

type MapLogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function MapLogo({
  href = "/",
  className,
  imageClassName,
  priority = true,
}: MapLogoProps) {
  const logo = (
    <Image
      src={BRAND_LOGOS.full}
      alt={BRAND_SHORT_NAME}
      width={280}
      height={105}
      priority={priority}
      className={cn("h-auto w-44 object-contain sm:w-56", imageClassName)}
    />
  );

  if (!href) {
    return <div className={className}>{logo}</div>;
  }

  return (
    <Link href={href} className={cn("transition-opacity hover:opacity-90", className)}>
      {logo}
    </Link>
  );
}
