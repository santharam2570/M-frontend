import type { Metadata } from "next";
import Link from "next/link";
import { MapLogo } from "@/components/brand/map-logo";
import { BRAND_NAME } from "@/config/brand";

export const metadata: Metadata = {
  title: `Privacy Policy | ${BRAND_NAME}`,
  description: `Privacy Policy for ${BRAND_NAME}.`,
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fa] px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <MapLogo />
        <article className="rounded-2xl border border-[#e4e7ec] bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-semibold text-[#1a2332]">Privacy Policy</h1>
          <p className="mt-4 text-sm leading-6 text-[#6b7280]">
            {BRAND_NAME} processes account, contact, and CRM data necessary to provide
            the service to your organization. Data is used to authenticate users,
            power CRM workflows, and support operational reporting. Access is limited
            to authorized users within your organization.
          </p>
          <p className="mt-3 text-sm leading-6 text-[#6b7280]">
            For privacy requests or questions, contact your organization administrator.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex text-sm font-medium text-[#0f2b4a] underline-offset-4 hover:underline"
          >
            Back to Login
          </Link>
        </article>
      </div>
    </div>
  );
}
