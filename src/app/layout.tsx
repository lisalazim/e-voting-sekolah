import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-Voting Sekolah",
  description:
    "Template aplikasi e-voting Ketua OSIS yang dapat digunakan ulang oleh sekolah.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-950">
        {children}
      </body>
    </html>
  );
}
