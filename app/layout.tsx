import type { Metadata } from "next";
import { Archivo, Tinos } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const tinos = Tinos({
  variable: "--font-tinos",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const description =
  "Redline reads a contract a client sent you and shows you the terms that will cost you, each one quoting the sentence it came from.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Redline",
  description,
  openGraph: {
    title: "Redline",
    description,
    url: "/",
    siteName: "Redline",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Redline",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${tinos.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
