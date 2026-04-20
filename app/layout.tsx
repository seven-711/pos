import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Manrope, Poppins } from "next/font/google";
import "./globals.css";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { SessionProvider } from "@/lib/contexts/SessionContext";
import { CartProvider } from "@/lib/contexts/CartContext";
import { NotificationProvider } from "@/lib/contexts/NotificationContext";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";

const manrope = Manrope({ 
  subsets: ["latin"],
  variable: "--font-heading",
  display: 'swap',
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "POS ni Estela",
  description: "Advanced AI CRM and Point of Sale System",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "POS ni Estela",
  },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#080616", // Matches your dashboard's deep surface in dark mode
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${poppins.variable}`}>
      <body className={`${poppins.className} antialiased surface-base min-h-screen text-[var(--color-on-surface)]`}>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <ThemeProvider>
          <AuthProvider>
            <SessionProvider>
              <CartProvider>
                <NotificationProvider>
                  <SidebarLayout>
                    {children}
                  </SidebarLayout>
                </NotificationProvider>
              </CartProvider>
            </SessionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
