"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden bg-[#f5f7fa]"
      >
        <Image
          src="/sign_in_bk.webp"
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

        <div className="relative w-full overflow-hidden rounded-2xl border border-white/40 bg-white/95 px-6 py-8 text-center shadow-[0_24px_64px_rgba(15,43,74,0.22)] backdrop-blur-xl sm:rounded-3xl sm:px-10 sm:py-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0f2b4a] via-[#1a4a7a] to-[#c73e3e]"
          />
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-8"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="m9 11 3 3L22 4" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#1a2332]">Check your email</h1>
          <p className="mt-2 text-sm text-[#6b7280]">
            We&apos;ve sent a password reset link to{" "}
            <span className="font-medium text-[#1a2332]">{email}</span>. Please
            check your inbox and follow the instructions.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#c73e3e] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1a4a7a]"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[#6b7280]">
          Loading…
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
