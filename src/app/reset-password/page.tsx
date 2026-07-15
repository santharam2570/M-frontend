"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapLogo } from "@/components/brand/map-logo";
import URLS from "@/config/urls";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sentEmail = searchParams.get("email");

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sentEmail) {
    return (
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
          <span className="font-medium text-[#1a2332]">{sentEmail}</span>. Please
          check your inbox and follow the instructions.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#c73e3e] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1a4a7a]"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(URLS.FORGOT_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          (data as { msg?: string })?.msg ||
            "Failed to send reset link. Please try again."
        );
        return;
      }

      router.push(`/reset-password?email=${encodeURIComponent(trimmed)}`);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/40 bg-white/95 px-6 py-8 shadow-[0_24px_64px_rgba(15,43,74,0.22)] backdrop-blur-xl sm:rounded-3xl sm:px-10 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0f2b4a] via-[#1a4a7a] to-[#c73e3e]"
      />
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-[#1a2332]">Reset password</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Enter your account email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-[#c73e3e]/30 bg-[#c73e3e]/5 px-3 py-2 text-sm text-[#c73e3e]"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor="reset-email" className="text-sm font-medium text-[#1a2332]">
            Email
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="m@example.com"
            className="h-11 w-full rounded-xl border border-[#e4e7ec] bg-white px-3 text-sm text-[#1a2332] outline-none transition-colors placeholder:text-[#9aa3b2] focus:border-[#0f2b4a] focus:ring-2 focus:ring-[#0f2b4a]/20"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#c73e3e] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1a4a7a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending…" : "Send reset link"}
        </button>

        <Link
          href="/login"
          className="text-center text-sm font-medium text-[#0f2b4a] underline-offset-4 hover:underline"
        >
          Back to Login
        </Link>
      </form>
    </div>
  );
}

function ResetPasswordContent() {
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
        <MapLogo className="mb-8" />
        <ResetPasswordForm />
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
