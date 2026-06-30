"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AuthApiError,
  authPost,
  clearPendingAuth,
  getPendingAuth,
  saveAuthUser,
} from "@/lib/auth";
import URLS from "@/config/urls";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 180;

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TwoStepForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingFlow, setPendingFlow] = useState<"signup" | "login">("login");

  const email = searchParams.get("email") ?? "your email";
  const otpValue = digits.join("");
  const isComplete = otpValue.length === OTP_LENGTH;

  const nextQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("email");
    const query = params.toString();
    return query ? `?${query}` : "";
  }, [searchParams]);

  useEffect(() => {
    const pending = getPendingAuth();
    if (!pending?.email || !pending?.userId) {
      router.replace("/login");
      return;
    }
    setPendingUserId(pending.userId);
    setPendingFlow(pending.flow);
  }, [router]);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  const focusInput = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  function handleDigitChange(index: number, value: string) {
    const sanitized = value.replace(/\D/g, "").slice(-1);

    setDigits((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });

    if (sanitized && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((char, index) => {
      next[index] = char;
    });
    setDigits(next);

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    focusInput(focusIndex);
  }

  async function handleResend() {
    if (!canResend || !pendingUserId || isResending) return;

    setError("");
    setIsResending(true);

    try {
      await authPost(
        pendingFlow === "signup" ? URLS.RESEND_OTP : URLS.LOGIN_RESEND_OTP,
        { user_id: pendingUserId }
      );
      setDigits(Array(OTP_LENGTH).fill(""));
      setCountdown(RESEND_COOLDOWN_SECONDS);
      setCanResend(false);
      focusInput(0);
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.message
          : "Unable to resend code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isComplete || !pendingUserId) return;

    setError("");
    setIsSubmitting(true);

    try {
      const pending = getPendingAuth();

      await authPost(URLS.OTP_VERIFY_MATCH, {
        user: pendingUserId,
        verify_otp: otpValue,
      });

      if (pendingFlow === "signup") {
        router.push(`/set-password${nextQuery}`);
        return;
      }

      if (pending?.loginData?.access_token) {
        saveAuthUser(pending.loginData);
      } else {
        throw new AuthApiError("Session expired. Please sign in again.", 401);
      }

      clearPendingAuth();
      router.push("/lead");
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.message
          : "Invalid verification code. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-[#9aa3b2] transition-colors hover:text-[#6b7280]"
      >
        <ArrowLeftIcon />
        Back to login
      </Link>

      <header className="flex flex-col items-center text-center">
        <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-[#f1f3f6] text-[#9aa3b2]">
          <MailIcon />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#1a2332] sm:text-2xl">
          2-Step Verification
        </h1>
        <p className="mt-2 text-sm text-[#9aa3b2]">
          Please enter the 6 digit code sent to{" "}
          <span className="font-medium text-[#1a2332]">{email}</span>
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-[#c73e3e]/30 bg-[#c73e3e]/5 px-3 py-2 text-center text-sm text-[#c73e3e]"
          >
            {error}
          </p>
        ) : null}

        <div
          className="flex flex-nowrap items-center justify-center gap-2"
          role="group"
          aria-label="One-time password"
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              onFocus={(event) => event.target.select()}
              className={`box-border size-11 shrink-0 rounded-md border bg-white p-0 text-center text-base font-medium text-[#1a2332] tabular-nums outline-none transition-colors focus:border-[#0f2b4a] focus:ring-2 focus:ring-[#0f2b4a]/20 ${
                digit ? "border-[#c5cad3]" : "border-[#e4e7ec]"
              }`}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={!isComplete || isSubmitting}
          className={`h-11 w-full rounded-xl text-sm font-semibold text-white transition-all disabled:cursor-not-allowed ${
            isComplete && !isSubmitting
              ? "bg-[#c73e3e] shadow-[0_4px_14px_rgba(199,62,62,0.35)] hover:bg-[#1a4a7a]"
              : "bg-[#c5cad3] opacity-80"
          }`}
        >
          {isSubmitting ? "Confirming…" : "Confirm"}
        </button>
      </form>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-sm text-[#9aa3b2]">
          Didn&apos;t receive code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || isResending}
            className={`font-bold text-[#1a2332] transition-colors ${
              canResend && !isResending
                ? "hover:text-[#0f2b4a]"
                : "cursor-not-allowed opacity-60"
            }`}
          >
            {isResending ? "Sending…" : "Resend code"}
          </button>
        </p>
        <p
          className="text-sm font-semibold tabular-nums text-[#1a2332]"
          aria-live="polite"
        >
          {formatCountdown(countdown)}
        </p>
      </div>
    </div>
  );
}
