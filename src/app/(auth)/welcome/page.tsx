import type { Metadata } from "next";

import { WelcomeScene } from "@/components/welcome/welcome-scene";
import { BRAND_NAME } from "@/config/brand";

export const metadata: Metadata = {
  title: `Welcome | ${BRAND_NAME}`,
  description: `Welcome to ${BRAND_NAME}.`,
};

export default function WelcomePage() {
  return <WelcomeScene />;
}
