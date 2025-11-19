import type { Metadata } from "next";
import "./globals.css";
import { TRPCProvider } from "./_providers/trpc-provider";

export const metadata: Metadata = {
  title: "Quick LMS",
  description: "A quick Learning Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
