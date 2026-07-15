import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BRAND_LOGOS, BRAND_NAME } from "@/config/brand";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "Discover properties, connect with agents, and find your next home.",
  icons: {
    icon: BRAND_LOGOS.icon,
    apple: BRAND_LOGOS.icon,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

// Runs before React hydration to apply the persisted theme immediately,
// preventing a light-mode flash for users who selected dark mode.
const themeInitScript = `
(function () {
  try {
    if (localStorage.getItem("map_theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
