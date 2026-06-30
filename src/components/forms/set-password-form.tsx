"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AuthApiError,
  clearPendingAuth,
  createNewPassword,
  getPendingAuth,
  saveAuthUser,
} from "@/lib/auth";

const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "number",
    label: "One number",
    test: (value: string) => /\d/.test(value),
  },
  {
    id: "special",
    label: "One special character",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6 sm:size-7"
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-2.5"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-2.5"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  autoComplete,
  error,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleVisibility: () => void;
  autoComplete: string;
  error?: string;
  onBlur?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[#1a2332]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={`Enter ${label.toLowerCase()}`}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          className={`h-11 w-full rounded-xl border bg-white px-3 pr-10 text-sm text-[#1a2332] outline-none transition-colors placeholder:text-[#9aa3b2] focus:ring-2 focus:ring-[#0f2b4a]/20 ${
            error
              ? "border-[#c73e3e]/60 focus:border-[#c73e3e]"
              : "border-[#e4e7ec] focus:border-[#0f2b4a]"
          }`}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-0.5 text-[#6b7280] transition-colors hover:text-[#0f2b4a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2b4a]/30"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          <EyeIcon open={showPassword} />
        </button>
      </div>
      {error ? (
        <p className="text-xs text-[#c73e3e]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ confirm: false });
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  useEffect(() => {
    const pending = getPendingAuth();
    if (!pending?.userId || pending.flow !== "signup") {
      router.replace("/sign-up");
      return;
    }
    setPendingUserId(pending.userId);
  }, [router]);

  const ruleResults = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        met: rule.test(password),
      })),
    [password]
  );

  const allRulesMet = ruleResults.every((rule) => rule.met);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const confirmError =
    touched.confirm && confirmPassword.length > 0 && !passwordsMatch
      ? "Passwords do not match"
      : undefined;

  const canSubmit =
    allRulesMet && passwordsMatch && !isSubmitting && Boolean(pendingUserId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !pendingUserId) return;

    setError("");
    setIsSubmitting(true);

    try {
      const pending = getPendingAuth();
      if (!pending?.userId || pending.flow !== "signup") {
        throw new AuthApiError(
          "Your session has expired. Please sign up again.",
          401
        );
      }

      const data = await createNewPassword(pending.userId, password);
      const loginData = {
        ...pending.loginData,
        ...data,
        result: {
          ...pending.loginData.result,
          ...data?.result,
          id: pending.userId,
          email: pending.email,
        },
      };

      clearPendingAuth();

      if (loginData.access_token) {
        saveAuthUser(loginData);
        router.push("/welcome");
        return;
      }

      router.push("/login");
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.message
          : "Unable to set password. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-[#f1f3f6] text-[#0f2b4a] shadow-inner sm:mb-5 sm:size-16">
          <LockIcon />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1a2332]">
          Set Password
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#6b7280]">
          Create a secure password to complete your account setup.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-[#c73e3e]/30 bg-[#c73e3e]/5 px-3 py-2 text-sm text-[#c73e3e]"
          >
            {error}
          </p>
        ) : null}

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPasswordValue}
          showPassword={showPassword}
          onToggleVisibility={() => setShowPassword((prev) => !prev)}
          autoComplete="new-password"
        />

        {password.length > 0 ? (
          <ul
            className="grid gap-2 rounded-xl border border-[#e4e7ec] bg-[#f5f7fa] p-3.5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-2 sm:p-4"
            aria-label="Password requirements"
          >
            {ruleResults.map((rule) => (
              <li
                key={rule.id}
                className={`flex items-center gap-2 text-xs transition-colors sm:text-[0.8125rem] ${
                  rule.met ? "text-[#0f7a4a]" : "text-[#6b7280]"
                }`}
              >
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full transition-all ${
                    rule.met
                      ? "bg-[#0f7a4a]/15 text-[#0f7a4a]"
                      : "bg-[#e4e7ec] text-[#9aa3b2]"
                  }`}
                  aria-hidden
                >
                  {rule.met ? <CheckIcon /> : <XIcon />}
                </span>
                <span className={rule.met ? "font-medium" : undefined}>
                  {rule.label}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <PasswordField
          id="confirm-password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          showPassword={showConfirmPassword}
          onToggleVisibility={() =>
            setShowConfirmPassword((prev) => !prev)
          }
          autoComplete="new-password"
          error={confirmError}
          onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-1 h-11 w-full rounded-xl bg-[#c73e3e] text-sm font-semibold tracking-wide text-white shadow-[0_4px_14px_rgba(199,62,62,0.35)] transition-all hover:bg-[#1a4a7a] hover:shadow-[0_6px_20px_rgba(199,62,62,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Setting up…" : "Finish"}
        </button>
      </form>
    </div>
  );
}
