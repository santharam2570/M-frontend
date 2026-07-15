"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

import { MapLogo } from "@/components/brand/map-logo"
import { Button } from "@/components/ui/button"

export default function SetupCompletePage() {
  const router = useRouter()

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

        <div className="relative w-full overflow-hidden rounded-2xl border border-white/40 bg-white/95 px-6 py-10 text-center shadow-[0_24px_64px_rgba(15,43,74,0.22)] backdrop-blur-xl sm:rounded-3xl sm:px-10 sm:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0f2b4a] via-[#1a4a7a] to-[#c73e3e]"
          />

          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-[#0f2b4a]/10 text-[#0f2b4a] sm:size-20">
            <CheckCircle2 className="size-9 sm:size-10" strokeWidth={1.75} />
          </div>

          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-[#1a2332]">
            Setup Complete
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-[#6b7280]">
            Your organization profile is ready. You can now start managing leads,
            projects, and bookings from your dashboard.
          </p>

          <Button
            size="lg"
            className="min-w-[200px] rounded-xl bg-[#0f2b4a] px-8 shadow-[0_4px_14px_rgba(15,43,74,0.35)] hover:bg-[#1a4a7a] hover:shadow-[0_6px_20px_rgba(15,43,74,0.4)]"
            onClick={() => router.push("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
