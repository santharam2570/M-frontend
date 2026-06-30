import type { Metadata } from "next";

import { WelcomeScene } from "@/components/welcome/welcome-scene";

export const metadata: Metadata = {
  title: "Welcome | MAP Real Estate",
  description: "Welcome to Makesh Asset Promoters.",
};

export default function WelcomePage() {
  return <WelcomeScene />;
}
