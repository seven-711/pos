import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import { SidebarLayout } from "@/components/layout/SidebarLayout";

const manrope = Manrope({ 
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "POS ni Estela",
  description: "Advanced AI CRM and Point of Sale System",
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png', type: 'image/png' },
    ],
  },
};

import { SessionProvider } from "@/lib/contexts/SessionContext";
import { CartProvider } from "@/lib/contexts/CartContext";
import { NotificationProvider } from "@/lib/contexts/NotificationContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${inter.variable} antialiased surface-base min-h-screen text-[var(--color-on-surface)]`}>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <SessionProvider>



          <CartProvider>
            <NotificationProvider>
              <SidebarLayout>
                {children}
              </SidebarLayout>
            </NotificationProvider>
          </CartProvider>
        </SessionProvider>

      </body>
    </html>
  );
}
