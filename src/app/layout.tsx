"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/theme.css";
import { AuthProvider } from "@/lib/auth-context";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Footer from "@/components/footer";
import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <SessionProvider>
            <AuthProvider>
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 container-fluid py-4 sm:py-6 md:py-8">{children}</main>
                <div className="container-fluid max-w-7xl mx-auto">
                  <Separator 
                    className="h-[3px] my-6 sm:my-8 footer-separator relative overflow-hidden" 
                    data-testid="footer-separator"
                  />
                </div>
                <Footer />
              </div>
            </AuthProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
