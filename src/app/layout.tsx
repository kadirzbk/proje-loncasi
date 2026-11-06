import type { Metadata } from "next";
import { Suspense } from "react";
import { Chakra_Petch, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { GameProvider } from "@/lib/store";
import { Shell } from "@/components/Shell";

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
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
      className={`${chakra.variable} ${plex.variable} ${plexMono.variable} h-full`}
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
