import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '8-Bit Wealth | Billionaires vs Average Americans',
  description: 'Visualize the wealth gap between billionaires and average Americans through 8-bit styled brick stacking animations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
