import type { Metadata } from "next";

export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
};

export default function VotingLayout({ children }: LayoutProps<"/pilih">) {
  return children;
}
