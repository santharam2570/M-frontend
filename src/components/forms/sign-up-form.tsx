"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import {
  AuthApiError,
  resolveSignupUserId,
  savePendingAuth,
  signup,
} from "@/lib/auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signUpQuery = useMemo(() => {
    const params = new URLSearchParams();
    const planId = searchParams.get("plan_id");
    const trial = searchParams.get("trial");
    const partnerId = searchParams.get("partner_id");
    const coupon = searchParams.get("coupon");

    if (planId) params.set("plan_id", planId);
    if (trial) params.set("trial", trial);
    if (partnerId) params.set("partner_id", partnerId);
    if (coupon) params.set("coupon", coupon);

    const query = params.toString();
    return query ? `?${query}` : "";
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        setError("Please enter your email address.");
        return;
      }

      const data = await signup({
        email: trimmedEmail,
        planId: searchParams.get("plan_id"),
        trial: searchParams.get("trial"),
        partnerId: searchParams.get("partner_id"),
        coupon: searchParams.get("coupon"),
      });

      const userId = resolveSignupUserId(data);
      if (!userId) {
        throw new AuthApiError(
          "Unable to complete registration. Please try again.",
          500
        );
      }

      savePendingAuth({
        email: trimmedEmail,
        userId,
        loginData: {
          result: { id: userId, email: trimmedEmail },
          organization: data.organization,
          roleData: data.roleData,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        },
        flow: "signup",
      });

      const params = new URLSearchParams(
        signUpQuery.startsWith("?") ? signUpQuery.slice(1) : signUpQuery
      );
      params.set("email", trimmedEmail);
      router.push(`/two-step?${params.toString()}`);
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.message
          : "Unable to sign up. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleSignUp() {
    setError("Google sign-up is not configured yet. Please use email.");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1a2332]">
          Sign Up
        </h1>
        <p className="text-sm text-[#6b7280]">
          Create your account with email or Google
        </p>
      </header>

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isSubmitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e4e7ec] bg-white text-sm font-medium text-[#1a2332] shadow-sm transition-colors hover:border-[#0f2b4a]/30 hover:bg-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        Sign up with Google
      </button>

      <div className="relative flex items-center">
        <div className="grow border-t border-[#e4e7ec]" />
        <span className="mx-4 shrink-0 text-xs font-medium uppercase tracking-wide text-[#9aa3b2]">
          Or continue with
        </span>
        <div className="grow border-t border-[#e4e7ec]" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-[#c73e3e]/30 bg-[#c73e3e]/5 px-3 py-2 text-sm text-[#c73e3e]"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="sign-up-email"
            className="text-sm font-medium text-[#1a2332]"
          >
            Email
          </label>
          <input
            id="sign-up-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            className="h-11 w-full rounded-xl border border-[#e4e7ec] bg-white px-3 text-sm text-[#1a2332] outline-none transition-colors placeholder:text-[#9aa3b2] focus:border-[#0f2b4a] focus:ring-2 focus:ring-[#0f2b4a]/20"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-xl bg-[#c73e3e] text-sm font-semibold tracking-wide text-white shadow-[0_4px_14px_rgba(199,62,62,0.35)] transition-all hover:bg-[#1a4a7a] hover:shadow-[0_6px_20px_rgba(199,62,62,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Signing up…" : "Sign Up"}
        </button>
      </form>

      <p className="text-center text-sm text-[#6b7280]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#1a2332] underline underline-offset-4 transition-colors hover:text-[#0f2b4a]"
        >
          Login
        </Link>
      </p>
    </div>
  );
}
