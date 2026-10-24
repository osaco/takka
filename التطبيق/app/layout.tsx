import type { Metadata, Viewport } from "next";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "تكة — جزيرتك تكبر بما تتعلم",
  description: "مساحة تعلم عربية هادئة للأطفال، يتطور فيها بيت المعرفة مع كل خطوة.",
  manifest: "/manifest.webmanifest",
  applicationName: "تكة",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "تكة" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F5F1E6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
