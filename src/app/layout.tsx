import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Archivo's width axis gives the condensed "board" lettering and the regular UI face from one family.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ConsultFlow Dental: turn enquiries into booked consultations",
    template: "%s | ConsultFlow Dental",
  },
  description:
    "ConsultFlow responds to new dental enquiries instantly, follows up automatically, books consultations and recovers leads your front desk never got to.",
};

export const viewport: Viewport = {
  themeColor: "#14181f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${archivo.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
