import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow" });

export const metadata: Metadata = { title: "Loco Trial Tools", description: "Daily Loco Trails and RadTx NMS" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={barlow.variable}>
      <body>
        <Nav />
        <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
