import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudySpotSG",
  description: "Find available study spaces in Singapore",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}