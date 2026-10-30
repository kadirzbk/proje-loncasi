import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, Martian_Mono } from "next/font/google";
import "./globals.css";
import { GameProvider } from "@/lib/store";
import { Shell } from "@/components/Shell";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  axes: ["SOFT", "opsz"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin", "latin-ext"],
});

const martian = Martian_Mono({
  variable: "--font-martian",
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
      className={`${fraunces.variable} ${hanken.variable} ${martian.variable} h-full`}
    >
      <body className="min-h-full">
        <GameProvider>
          <Shell>{children}</Shell>
        </GameProvider>
      </body>
    </html>
  );
}
