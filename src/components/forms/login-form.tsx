"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  AuthApiError,
  login,
  requiresTwoStepVerification,
  resolveAuthUserId,
  saveAuthUser,
  savePendingAuth,
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

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden="true"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!email.trim() || !password) {
        setError("Please enter your email and password.");
        return;
      }

      const data = await login(email, password);

      if (requiresTwoStepVerification(data)) {
        const userId = resolveAuthUserId(data);
        if (!userId) {
          throw new AuthApiError("Unable to start verification. Please try again.", 500);
        }

        savePendingAuth({
          email: email.trim(),
          userId,
          loginData: data,
          flow: "login",
        });
        router.push(`/two-step?email=${encodeURIComponent(email.trim())}`);
        return;
      }

      saveAuthUser(data);
      router.push("/lead");
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    setError("Google login is not configured yet. Please use email and password.");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1a2332]">
          Welcome back
        </h1>
        <p className="text-sm text-[#6b7280]">Login with your Google account</p>
      </header>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isSubmitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e4e7ec] bg-white text-sm font-medium text-[#1a2332] shadow-sm transition-colors hover:border-[#0f2b4a]/30 hover:bg-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        Login with Google
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
          <label htmlFor="email" className="text-sm font-medium text-[#1a2332]">
            Email
          </label>
          <input
            id="email"
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[#1a2332]"
            >
              Password
            </label>
            <Link
              href="/reset-password"
              className="text-sm font-medium text-[#0f2b4a] underline-offset-4 transition-colors hover:text-[#1a4a7a] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="h-11 w-full rounded-xl border border-[#e4e7ec] bg-white px-3 pr-10 text-sm text-[#1a2332] outline-none transition-colors placeholder:text-[#9aa3b2] focus:border-[#0f2b4a] focus:ring-2 focus:ring-[#0f2b4a]/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-0.5 text-[#6b7280] transition-colors hover:text-[#0f2b4a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2b4a]/30"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-xl bg-[#0f2b4a] text-sm font-semibold tracking-wide text-white shadow-[0_4px_14px_rgba(15,43,74,0.35)] transition-all hover:bg-[#1a4a7a] hover:shadow-[0_6px_20px_rgba(15,43,74,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Logging in…" : "Login"}
        </button>
      </form>

      <p className="text-center text-sm text-[#6b7280]">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-[#1a2332] underline underline-offset-4 transition-colors hover:text-[#0f2b4a]"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
