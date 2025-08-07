import '../lib/orpc.server'

import type { Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'ORPC Playground',
  description: 'End-to-end typesafe APIs builder, Developer-first simplicity',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
