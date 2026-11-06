import type { Metadata } from "next";
import { Suspense } from "react";
import { Pixelify_Sans, Press_Start_2P, Rubik, VT323 } from "next/font/google";
import "./globals.css";
import { GameProvider } from "@/lib/store";
import { Shell } from "@/components/Shell";

const pixel = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

const pixelify = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin", "latin-ext"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "latin-ext"],
});

const vt = VT323({
  variable: "--font-vt",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Proje Loncası",
  description:
    "Kod ve tasarım görevlerini bir kale savunması oyununa çeviren takım platformu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${pixel.variable} ${pixelify.variable} ${rubik.variable} ${vt.variable} h-full`}
    >
      <body className="min-h-full">
        <Suspense fallback={<p className="eyebrow py-24 text-center">Lonca açılıyor…</p>}>
          <GameProvider>
            <Shell>{children}</Shell>
          </GameProvider>
        </Suspense>
      </body>
    </html>
  );
}
