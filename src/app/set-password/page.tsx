import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SetPasswordForm } from "@/components/forms/set-password-form";

export const metadata: Metadata = {
  title: "Set Password | MAP Real Estate",
  description: "Create a secure password for your MAP account.",
};

export default function SetPasswordPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden bg-[#f5f7fa]"
      >
        <Image
          src="/psw_page.webp"
          alt=""
          fill
          priority
          className="scale-105 object-cover blur-md"
        />
        <div className="absolute inset-0 bg-[#0f2b4a]/40" />
      </div>

      <div className="flex w-full max-w-md flex-col items-center">
        <Link href="/" className="mb-8 transition-opacity hover:opacity-90">
          <Image
            src="/LOGOmap.png"
            alt="Mahesh Asset Promoters"
            width={280}
            height={105}
            priority
            className="h-auto w-44 object-contain sm:w-56"
          />
        </Link>

        <div className="relative w-full overflow-hidden rounded-2xl border border-white/40 bg-white/95 shadow-[0_24px_64px_rgba(15,43,74,0.22)] backdrop-blur-xl sm:rounded-3xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0f2b4a] via-[#1a4a7a] to-[#c73e3e]"
          />
          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <SetPasswordForm />
          </div>
        </div>

        <p className="mt-8 max-w-md text-center text-xs text-white/90">
          By clicking continue, you agree to our{" "}
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-white"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-white"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
