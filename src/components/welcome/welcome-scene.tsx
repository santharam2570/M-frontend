"use client";

import { Playfair_Display } from "next/font/google";
import Link from "next/link";

import { EarthGlobe } from "@/components/welcome/earth-globe";

const welcomeFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

export function WelcomeScene() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 py-12 sm:px-8">
      {/* Deep space gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,#1a3a5c_0%,#0a0f1a_45%,#050810_100%)]"
      />

      {/* Star field */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-60"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 30% 65%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 55% 15%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 72% 42%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 88% 78%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 15% 88%, rgba(255,255,255,0.35) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 45% 90%, rgba(255,255,255,0.45) 0%, transparent 100%),
            radial-gradient(1px 1px at 92% 12%, rgba(255,255,255,0.55) 0%, transparent 100%)
          `,
        }}
      />

      {/* Ambient glow accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 left-1/2 -z-10 size-[min(90vw,48rem)] -translate-x-1/2 rounded-full bg-[#1a4a7a]/20 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/4 -left-1/4 -z-10 size-[min(70vw,36rem)] rounded-full bg-[#c73e3e]/8 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-1/4 bottom-0 -z-10 size-[min(60vw,32rem)] rounded-full bg-[#2563eb]/10 blur-[100px]"
      />

      {/* Subtle horizon line */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[38%] -z-10 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent sm:top-[40%]"
      />

      <div className="flex w-full max-w-5xl flex-col items-center gap-8 sm:gap-10 lg:gap-12">
        <div className="animate-in fade-in zoom-in-95 flex w-full justify-center duration-1000 fill-mode-both">
          <EarthGlobe />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center gap-5 text-center duration-1000 fill-mode-both delay-300">
          <h1
            className={`${welcomeFont.className} max-w-3xl text-[clamp(2rem,6vw,3.75rem)] leading-[1.15] font-semibold tracking-[0.02em] text-white`}
            style={{
              textShadow:
                "0 0 48px rgba(59, 130, 246, 0.2), 0 2px 24px rgba(0, 0, 0, 0.35)",
            }}
          >
            Welcome to Makesh Asset Promoters
          </h1>

          <div
            aria-hidden
            className="h-px w-20 bg-gradient-to-r from-transparent via-[#c73e3e]/50 to-transparent sm:w-28"
          />

          <Link
            href="/organization-profile"
            className="animate-in fade-in slide-in-from-bottom-4 mt-2 inline-flex h-11 min-w-[180px] items-center justify-center rounded-xl bg-[#c73e3e] px-8 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(199,62,62,0.35)] transition-colors duration-1000 fill-mode-both delay-500 hover:bg-[#1a4a7a]"
          >
            Continue to Organization
          </Link>
        </div>
      </div>

      {/* Bottom vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[#050810] to-transparent"
      />
    </main>
  );
}
