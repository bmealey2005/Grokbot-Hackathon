import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recall",
  description: "Turn a reading into an interactive study session and source-grounded feedback.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" data-theme="light"><body>{children}</body></html>;
}
