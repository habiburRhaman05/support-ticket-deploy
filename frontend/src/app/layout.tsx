import { Orbitron, Space_Grotesk } from "next/font/google"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
})

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
})

import type { Metadata } from "next"
import { Toaster } from "sonner"
import QueryProvider from "@/providers/QueryProvider"
import ReduxProvider from "@/providers/ReduxProvider"
import ThemeProvider from "@/providers/ThemeProvider"

export const metadata: Metadata = {
  title: "Agency Dashboard",
  description: "Enterprise agency management system",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${orbitron.variable} font-sans antialiased`}
      >
        <ReduxProvider>
          <QueryProvider>
            <ThemeProvider>
              {children}
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </QueryProvider>
        </ReduxProvider>
      </body>
    </html>
  )
}
